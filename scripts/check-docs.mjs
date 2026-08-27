#!/usr/bin/env node
// Structural and GitBook-rendering checks for the Korean docs tree: every
// SUMMARY entry resolves, every page is reachable, every relative link/image
// resolves, and every fragment matches the ID GitBook actually renders.
//
// Usage: node scripts/check-docs.mjs [root]   (default root: repo root)

import { readdirSync, readFileSync, existsSync } from 'node:fs'
import { join, relative, resolve, dirname, posix } from 'node:path'
import { fileURLToPath } from 'node:url'

const IGNORED_DIRS = new Set(['.git', 'node_modules', '.uai', 'scripts'])
const ASSET_DIR = '.gitbook/assets'
const SUMMARY = 'SUMMARY.md'
const EXTERNAL = /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i
const HAS_HANGUL = /\p{Script=Hangul}/u

/*
 * GitBook's current Korean heading renderer does not preserve Hangul in IDs.
 * Pure-Hangul headings become `undefined`, `undefined-1`, ... in document
 * order. Mixed headings retain their ASCII residue (for example, "1단계" is
 * `id-1` and "RIPE 가치 축적" is `ripe`). This algorithm was checked against
 * all 353 headings in the exact PR preview at 613a6ac with zero mismatches.
 */

/** Remove Markdown presentation syntax from a heading. */
export function plainHeading(heading) {
  return heading
    .replace(/`([^`]*)`/g, '$1')
    .replace(/!?\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[*_~]/g, '')
    .trim()
}

/** GitBook's unnumbered base ID for a heading that contains Hangul. */
export function koreanGitBookBase(heading) {
  let slug = plainHeading(heading)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/\$/g, 'usd')
    .replace(/\p{Script=Hangul}/gu, ' ')
    .replace(/%/g, '')
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^[.-]+|[.-]+$/g, '')
  if (!slug) slug = 'undefined'
  if (/^\d/.test(slug)) slug = `id-${slug}`
  return slug
}

/** Exact unnumbered ID observed from GitBook for any heading on this space. */
export function slugVariants(heading) {
  return [koreanGitBookBase(heading)]
}

export const slugify = (heading) => slugVariants(heading)[0]

// Each Korean deep link is bound to the heading text observed at that exact ID
// in the live PR preview. This catches order drift where `undefined-N` still
// exists but silently points at a different section.
export const VERIFIED_KOREAN_ANCHORS = new Map([
  ['core-protocol/00-stock-tokens.md#undefined-2', '거래 시간과 주말 공백'],
  ['core-protocol/00-stock-tokens.md#undefined-3', '가격을 사용할 수 없을 때'],
  ['core-protocol/00-stock-tokens.md#undefined-4', '어떤 경우에 토큰이 이동하나요?'],
  ['core-protocol/01-green-stablecoin.md#id-6.-psm', '6. 페그 안정화 모듈(PSM)'],
  ['core-protocol/02-borrowing.md#undefined-1', '가중 부채 조건 이해하기'],
  ['core-protocol/02-borrowing.md#undefined-3', '기준치가 함께 작동하는 방식: 시각 가이드'],
  ['core-protocol/02-borrowing.md#undefined-5', '변동 금리'],
  ['core-protocol/02-borrowing.md#underscore-earn', 'Underscore Earn 볼트 통합'],
  ['core-protocol/04-liquidations.md#undefined-2', '청산이 중요한 이유'],
  ['core-protocol/04-liquidations.md#undefined-5', '위험 구간 이해하기'],
  ['core-protocol/04-liquidations.md#undefined-8', '담보 상환 버퍼'],
  ['core-protocol/04-liquidations.md#id-1', '1단계: 안정화 풀 스왑'],
  ['core-protocol/04-liquidations.md#id-2', '2단계: 더치 경매'],
  ['core-protocol/04-liquidations.md#undefined-14', '청산 경제'],
  ['core-protocol/04-liquidations.md#undefined-17', '키퍼 네트워크'],
  ['core-protocol/04-liquidations.md#undefined-19', '부실 채권이 발생하면'],
  ['core-protocol/05-deleverage.md#undefined-2', '특정 자산으로 직접 디레버리지'],
  ['core-protocol/06-price-oracles.md#undefined-5', '계정 가치를 평가할 수 없을 때'],
  ['governance-and-economics/01-ripe-tokenomics.md#id-10', '공급 한도: 어디서나 10억'],
  ['governance-and-economics/01-ripe-tokenomics.md#ripe', 'RIPE 가치 축적'],
  ['governance-and-economics/02-governance.md#undefined-6', '포지션 관리'],
  ['governance-and-economics/02-governance.md#undefined-9', '중도 해지: 최후의 수단'],
  ['governance-and-economics/03-bonds.md#undefined-9', '본드와 부실 채권'],
  ['user-guide/06-get-and-lock-ripe.md#undefined', '보상을 청구할 때 잠금이 적용되는 방식'],
])

/** Links and images: [text](target) / ![alt](target), ignoring titles. */
const LINK_RE = /(!?)\[([^\]]*)\]\(\s*<?([^)\s>]*)>?(?:\s+["'][^"']*["'])?\s*\)/g

/** Blank out fenced code blocks, preserving line numbering. */
function stripFences(text) {
  let fence = null
  return text.split('\n').map((line) => {
    const m = line.match(/^\s{0,3}(`{3,}|~{3,})/)
    if (fence) {
      if (m && m[1][0] === fence[0] && m[1].length >= fence.length) fence = null
      return ''
    }
    if (m) { fence = m[1]; return '' }
    return line
  })
}

function splitHash(raw) {
  const i = raw.indexOf('#')
  return i === -1 ? [raw, ''] : [raw.slice(0, i), raw.slice(i + 1)]
}

function decoded(value) {
  try { return decodeURIComponent(value) } catch { return value }
}

export function parseMarkdown(text) {
  const lines = stripFences(text)
  const links = []
  const headings = []
  const seenSlugs = new Map()

  lines.forEach((line, i) => {
    const h = line.match(/^(#{1,6})\s+(.+?)\s*$/)
    if (h) {
      const level = h[1].length
      let slugs = []
      // GitBook renders the page-title H1 without an id, and it does not
      // consume an `undefined-N` slot for following Korean headings.
      if (level > 1) {
        const variants = slugVariants(h[2])
        const n = seenSlugs.get(variants[0]) ?? 0
        seenSlugs.set(variants[0], n + 1)
        slugs = n ? variants.map((v) => `${v}-${n}`) : variants
      }
      headings.push({ level, text: h[2], plain: plainHeading(h[2]), slugs, line: i + 1 })
    }
    for (const m of line.matchAll(LINK_RE)) {
      const [target, hash] = splitHash(m[3])
      links.push({ isImage: m[1] === '!', text: m[2], target, hash, raw: m[3], line: i + 1 })
    }
  })
  return { links, headings }
}

function walk(root, dir = root, out = []) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      if (IGNORED_DIRS.has(entry.name)) continue
      walk(root, join(dir, entry.name), out)
    } else {
      out.push(relative(root, join(dir, entry.name)).split('\\').join('/'))
    }
  }
  return out
}

export function checkDocs(root) {
  const issues = []
  const add = (file, line, code, message) => issues.push({ file, line, code, message })
  const files = walk(root)
  const pages = files.filter((f) => f.endsWith('.md') && f !== SUMMARY)
  const assets = files.filter((f) => f.startsWith(`${ASSET_DIR}/`))
  const parsed = new Map()
  for (const f of [...pages, SUMMARY]) {
    if (existsSync(join(root, f))) parsed.set(f, parseMarkdown(readFileSync(join(root, f), 'utf8')))
  }

  // 1. SUMMARY entries resolve, are markdown, and are not duplicated.
  const summaryTargets = new Map()
  const summary = parsed.get(SUMMARY)
  if (!summary) {
    add(SUMMARY, 0, 'summary-missing', `${SUMMARY} not found`)
  } else {
    for (const link of summary.links) {
      if (link.isImage || !link.target || EXTERNAL.test(link.target)) continue
      const rel = posix.normalize(link.target)
      if (!rel.endsWith('.md')) {
        add(SUMMARY, link.line, 'summary-not-markdown', `entry "${link.text}" points at a non-markdown file: ${link.target}`)
        continue
      }
      if (!existsSync(join(root, rel))) {
        add(SUMMARY, link.line, 'summary-missing-target', `entry "${link.text}" points at a missing page: ${link.target}`)
        continue
      }
      if (summaryTargets.has(rel)) {
        add(SUMMARY, link.line, 'summary-duplicate', `${rel} is already listed on line ${summaryTargets.get(rel)}`)
      } else {
        summaryTargets.set(rel, link.line)
      }
    }
  }

  // 2. No page is unreachable from SUMMARY.
  for (const page of pages) {
    if (!summaryTargets.has(page)) add(page, 0, 'orphan-page', `not listed in ${SUMMARY}`)
  }

  const referencedAssets = new Set()

  const checkAnchor = (sourceFile, sourceLine, targetFile, hash, targetDoc) => {
    const fragment = decoded(hash)
    if (HAS_HANGUL.test(fragment)) {
      add(sourceFile, sourceLine, 'unrendered-anchor', `GitBook does not render Korean source fragment #${fragment}`)
      return
    }

    const heading = targetDoc?.headings.find((h) => h.slugs.includes(fragment))
    if (!heading) {
      add(sourceFile, sourceLine, 'broken-anchor', `${targetFile} has no GitBook-rendered heading matching #${fragment}`)
      return
    }

    if (HAS_HANGUL.test(heading.plain)) {
      const key = `${targetFile}#${fragment}`
      const expected = VERIFIED_KOREAN_ANCHORS.get(key)
      if (!expected) {
        add(sourceFile, sourceLine, 'unverified-gitbook-anchor', `${key} has not been bound to a heading in a GitBook preview`)
      } else if (heading.plain !== expected) {
        add(sourceFile, sourceLine, 'anchor-target-drift', `${key} now points to "${heading.plain}", expected "${expected}"`)
      }
    }
  }

  for (const [file, doc] of parsed) {
    const dir = dirname(file)

    // 3. Frontmatter description + exactly one H1 (SUMMARY is exempt).
    if (file !== SUMMARY) {
      const text = readFileSync(join(root, file), 'utf8')
      const fm = text.match(/^---\n([\s\S]*?)\n---\n/)
      if (!fm) add(file, 1, 'missing-frontmatter', 'no YAML frontmatter block')
      else if (!/^description:\s*\S/m.test(fm[1])) add(file, 1, 'missing-description', 'frontmatter has no non-empty description')

      const h1s = doc.headings.filter((h) => h.level === 1)
      if (h1s.length !== 1) add(file, h1s[1]?.line ?? 1, 'h1-count', `expected exactly 1 H1, found ${h1s.length}`)
    }

    for (const link of doc.links) {
      // SUMMARY page targets were resolved above; still validate any fragment
      // on them so the inventory has no unchecked internal-anchor lane.
      if (file === SUMMARY) {
        if (link.hash && link.target && !EXTERNAL.test(link.raw)) {
          const rel = posix.normalize(decoded(link.target))
          if (parsed.has(rel)) checkAnchor(file, link.line, rel, link.hash, parsed.get(rel))
        }
        continue
      }

      // 4. Images carry alt text.
      if (link.isImage && !link.text.trim()) add(file, link.line, 'missing-alt', `image has no alt text: ${link.raw}`)

      // 5. Nothing points back at the source bundle's layout.
      if (link.raw.includes('user-guide-screenshots/')) add(file, link.line, 'stale-path', `references the source bundle path: ${link.raw}`)

      if (EXTERNAL.test(link.raw)) continue

      // 6. Same-page anchors resolve to GitBook-rendered IDs.
      if (!link.target) {
        if (link.hash) checkAnchor(file, link.line, file, link.hash, doc)
        continue
      }

      // 7. Relative targets resolve.
      const rel = posix.normalize(posix.join(dir === '.' ? '' : dir, decoded(link.target)))
      if (rel.startsWith('..')) {
        add(file, link.line, 'escapes-repo', `link escapes the docs root: ${link.raw}`)
        continue
      }
      if (!existsSync(join(root, rel))) {
        add(file, link.line, link.isImage ? 'broken-image' : 'broken-link', `target does not exist: ${link.raw}`)
        continue
      }
      if (rel.startsWith(`${ASSET_DIR}/`)) referencedAssets.add(rel)

      // 8. Cross-page anchors resolve to GitBook-rendered IDs.
      if (link.hash && rel.endsWith('.md')) checkAnchor(file, link.line, rel, link.hash, parsed.get(rel))
    }
  }

  // 9. Every committed asset is used by something.
  for (const asset of assets) {
    if (!referencedAssets.has(asset)) add(asset, 0, 'orphan-asset', 'committed but never referenced')
  }

  return issues.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line)
}

const isMain = process.argv[1] && resolve(process.argv[1]) === resolve(fileURLToPath(import.meta.url))
if (isMain) {
  const root = resolve(process.argv[2] ?? join(dirname(fileURLToPath(import.meta.url)), '..'))
  const issues = checkDocs(root)
  for (const i of issues) console.error(`${i.file}:${i.line}  [${i.code}] ${i.message}`)
  const pageCount = walk(root).filter((f) => f.endsWith('.md')).length
  if (issues.length) {
    console.error(`\n${issues.length} problem(s) found across ${pageCount} markdown file(s).`)
    process.exit(1)
  }
  console.log(`docs ok: ${pageCount} markdown file(s), no structural or GitBook-anchor problems.`)
}
