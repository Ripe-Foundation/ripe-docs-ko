// Tests for the Korean docs checker. Each check builds a throwaway docs tree,
// so a rule that silently stops firing fails loudly here.
//
// Usage: node --test scripts/check-docs.test.mjs

import { test, describe } from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import {
  checkDocs,
  koreanGitBookBase,
  parseMarkdown,
  slugify,
  slugVariants,
} from './check-docs.mjs'

const REPO_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function check(files) {
  const root = mkdtempSync(join(tmpdir(), 'docs-check-ko-'))
  try {
    for (const [path, contents] of Object.entries(files)) {
      mkdirSync(dirname(join(root, path)), { recursive: true })
      writeFileSync(join(root, path), contents)
    }
    return checkDocs(root)
  } finally {
    rmSync(root, { recursive: true, force: true })
  }
}

const codes = (issues) => issues.map((i) => i.code).sort()
const page = (title, body = '') => `---\ndescription: A page.\n---\n\n# ${title}\n\n${body}\n`
const SHOT = '![A screenshot](../.gitbook/assets/shot.png)'
const onePage = (body = '') => page('One', `${SHOT}\n\n${body}`)

const CLEAN = {
  'SUMMARY.md': '# Table of contents\n\n* [Home](README.md)\n\n## Guides\n\n* [One](guides/01-one.md)\n',
  'README.md': page('Home', 'See [One](guides/01-one.md).'),
  'guides/01-one.md': page('One', SHOT),
  '.gitbook/assets/shot.png': 'PNG',
}

const withClean = (overrides) => ({ ...CLEAN, ...overrides })

describe('checkDocs', () => {
  test('a well-formed tree reports nothing', () => {
    assert.deepEqual(check(CLEAN), [])
  })

  test('the real repo is clean', () => {
    const issues = checkDocs(REPO_ROOT)
    assert.deepEqual(issues, [], issues.map((i) => `${i.file}:${i.line} [${i.code}] ${i.message}`).join('\n'))
  })

  describe('SUMMARY', () => {
    test('flags an entry with no page behind it', () => {
      const issues = check(withClean({
        'SUMMARY.md': CLEAN['SUMMARY.md'] + '* [Two](guides/02-two.md)\n',
      }))
      assert.deepEqual(codes(issues), ['summary-missing-target'])
    })

    test('flags a page missing from the table of contents', () => {
      const issues = check(withClean({ 'guides/02-two.md': page('Two') }))
      assert.deepEqual(codes(issues), ['orphan-page'])
    })

    test('flags the same page listed twice', () => {
      const issues = check(withClean({
        'SUMMARY.md': CLEAN['SUMMARY.md'] + '* [One again](guides/01-one.md)\n',
      }))
      assert.deepEqual(codes(issues), ['summary-duplicate'])
    })

    test('flags an entry pointing at a non-markdown file', () => {
      const issues = check(withClean({
        'SUMMARY.md': CLEAN['SUMMARY.md'] + '* [Shot](.gitbook/assets/shot.png)\n',
      }))
      assert.deepEqual(codes(issues), ['summary-not-markdown'])
    })

    test('leaves external entries alone', () => {
      assert.deepEqual(check(withClean({
        'SUMMARY.md': CLEAN['SUMMARY.md'] + '* [GitHub](https://github.com/Ripe-Foundation/ripe-protocol)\n',
      })), [])
    })

    test('validates a fragment attached to a SUMMARY entry', () => {
      const issues = check(withClean({
        'SUMMARY.md': CLEAN['SUMMARY.md'].replace('guides/01-one.md', 'guides/01-one.md#does-not-exist'),
      }))
      assert.deepEqual(codes(issues), ['broken-anchor'])
    })
  })

  describe('links', () => {
    test('flags a relative link with no file behind it', () => {
      const issues = check(withClean({ 'guides/01-one.md': onePage('See [Two](02-two.md).') }))
      assert.deepEqual(codes(issues), ['broken-link'])
    })

    test('flags an image with no file behind it', () => {
      const issues = check(withClean({ 'guides/01-one.md': onePage('![Shot](../.gitbook/assets/missing.png)') }))
      assert.deepEqual(codes(issues), ['broken-image'])
    })

    test('flags a link that climbs out of the docs root', () => {
      const issues = check(withClean({ 'guides/01-one.md': onePage('[Escape](../../secrets.md)') }))
      assert.deepEqual(codes(issues), ['escapes-repo'])
    })

    test('accepts a link that resolves through a parent directory', () => {
      assert.deepEqual(check(withClean({ 'guides/01-one.md': onePage('[Home](../README.md)') })), [])
    })

    test('ignores links inside backtick-fenced code blocks', () => {
      assert.deepEqual(check(withClean({
        'guides/01-one.md': onePage('```md\n[Nope](nowhere.md)\n![Nope](nowhere.png)\n```'),
      })), [])
    })

    test('ignores links inside tilde-fenced code blocks', () => {
      assert.deepEqual(check(withClean({
        'guides/01-one.md': onePage('~~~\n[Nope](nowhere.md)\n~~~'),
      })), [])
    })

    test('ignores external and mailto targets', () => {
      assert.deepEqual(check(withClean({
        'guides/01-one.md': onePage('[Site](https://ripe.finance) [Mail](mailto:hi@ripe.finance)'),
      })), [])
    })
  })

  describe('ordinary anchors', () => {
    const target = page('Two', '## Deposit Collateral\n\nText.')

    test('accepts a cross-page anchor that exists', () => {
      assert.deepEqual(check(withClean({
        'SUMMARY.md': CLEAN['SUMMARY.md'] + '* [Two](guides/02-two.md)\n',
        'guides/01-one.md': onePage('[Go](02-two.md#deposit-collateral)'),
        'guides/02-two.md': target,
      })), [])
    })

    test('flags a cross-page anchor that does not exist', () => {
      const issues = check(withClean({
        'SUMMARY.md': CLEAN['SUMMARY.md'] + '* [Two](guides/02-two.md)\n',
        'guides/01-one.md': onePage('[Go](02-two.md#deposit-collatoral)'),
        'guides/02-two.md': target,
      }))
      assert.deepEqual(codes(issues), ['broken-anchor'])
    })

    test('flags a same-page anchor that does not exist', () => {
      const issues = check(withClean({
        'guides/01-one.md': onePage('## Real\n\n[Jump](#not-real)'),
      }))
      assert.deepEqual(codes(issues), ['broken-anchor'])
    })

    test('accepts a same-page anchor that exists', () => {
      assert.deepEqual(check(withClean({
        'guides/01-one.md': onePage('## Real Heading\n\n[Jump](#real-heading)'),
      })), [])
    })

    test('repeated English headings get numbered slugs', () => {
      assert.deepEqual(check(withClean({
        'guides/01-one.md': onePage('## Steps\n\n## Steps\n\n[a](#steps) [b](#steps-1)'),
      })), [])
    })
  })

  describe('Korean GitBook anchors', () => {
    const stockTarget = (prefix = '') => page('주식 토큰', [
      '## 예치하면 어떻게 되나요?',
      '',
      '## 주식 토큰의 가격은 어떻게 정해지나요?',
      '',
      prefix,
      prefix ? '' : null,
      '### 거래 시간과 주말 공백',
    ].filter((line) => line !== null).join('\n'))

    const koreanTree = (fragment, prefix = '') => withClean({
      'SUMMARY.md': CLEAN['SUMMARY.md'] + '* [Stock](core-protocol/00-stock-tokens.md)\n',
      'guides/01-one.md': onePage(`[Go](../core-protocol/00-stock-tokens.md#${fragment})`),
      'core-protocol/00-stock-tokens.md': stockTarget(prefix),
    })

    test('accepts an exact preview-bound undefined-N ID', () => {
      assert.deepEqual(check(koreanTree('undefined-2')), [])
    })

    test('rejects a source-style Korean fragment', () => {
      const issues = check(koreanTree('거래-시간과-주말-공백'))
      assert.deepEqual(codes(issues), ['unrendered-anchor'])
    })

    test('rejects a percent-encoded source-style Korean fragment', () => {
      const encoded = encodeURIComponent('거래-시간과-주말-공백')
      const issues = check(koreanTree(encoded))
      assert.deepEqual(codes(issues), ['unrendered-anchor'])
    })

    test('detects when an existing undefined-N ID drifts to another heading', () => {
      const issues = check(koreanTree('undefined-2', '### 새 구간'))
      assert.deepEqual(codes(issues), ['anchor-target-drift'])
      assert.match(issues[0].message, /새 구간/)
    })

    test('requires new Korean opaque anchors to be preview-verified', () => {
      const issues = check(withClean({
        'guides/01-one.md': onePage('## 새로운 구간\n\n[Jump](#undefined)'),
      }))
      assert.deepEqual(codes(issues), ['unverified-gitbook-anchor'])
    })

    test('the H1 does not consume the first undefined ID', () => {
      const parsed = parseMarkdown(page('한국어 제목', '## 첫 항목\n\n## 둘째 항목'))
      assert.deepEqual(parsed.headings.map((h) => h.slugs), [[], ['undefined'], ['undefined-1']])
    })

    test('repeated pure-Korean headings receive undefined-N IDs in order', () => {
      const parsed = parseMarkdown(page('제목', '## 반복\n\n## 반복\n\n## 다른 제목'))
      assert.deepEqual(parsed.headings.map((h) => h.slugs), [[], ['undefined'], ['undefined-1'], ['undefined-2']])
    })
  })

  describe('assets', () => {
    test('flags an asset nothing points at', () => {
      const issues = check(withClean({ '.gitbook/assets/unused.png': 'PNG' }))
      assert.deepEqual(codes(issues), ['orphan-asset'])
    })

    test('flags a leftover source-bundle path', () => {
      const issues = check(withClean({
        'guides/01-one.md': onePage('![Old](user-guide-screenshots/01-dashboard.png)'),
      }))
      assert.equal(codes(issues).includes('stale-path'), true)
    })
  })

  describe('page shape', () => {
    test('flags a page with no frontmatter', () => {
      const issues = check(withClean({ 'guides/01-one.md': `# One\n\n${SHOT}\n` }))
      assert.deepEqual(codes(issues), ['missing-frontmatter'])
    })

    test('flags an empty description', () => {
      const issues = check(withClean({
        'guides/01-one.md': `---\ndescription:\n---\n\n# One\n\n${SHOT}\n`,
      }))
      assert.deepEqual(codes(issues), ['missing-description'])
    })

    test('flags a second H1', () => {
      const issues = check(withClean({ 'guides/01-one.md': onePage('# Another') }))
      assert.deepEqual(codes(issues), ['h1-count'])
    })

    test('flags a page with no H1', () => {
      const issues = check(withClean({
        'guides/01-one.md': `---\ndescription: A page.\n---\n\n## Only a subhead\n\n${SHOT}\n`,
      }))
      assert.deepEqual(codes(issues), ['h1-count'])
    })

    test('flags an image with no alt text', () => {
      const issues = check(withClean({ 'guides/01-one.md': page('One', '![](../.gitbook/assets/shot.png)') }))
      assert.deepEqual(codes(issues), ['missing-alt'])
    })
  })
})

describe('GitBook slug generation', () => {
  const englishCases = [
    ['Deposit Collateral', 'deposit-collateral'],
    ['Guide 1: Deposit collateral', 'guide-1-deposit-collateral'],
    ['**Bold** heading', 'bold-heading'],
    ['A `code` span', 'a-code-span'],
    ['Underscore Earn Vault Integration', 'underscore-earn-vault-integration'],
    ['Trailing spaces   ', 'trailing-spaces'],
    ['[A link](x.md) inside', 'a-link-inside'],
  ]
  for (const [input, expected] of englishCases) {
    test(`${JSON.stringify(input)} -> ${expected}`, () => assert.equal(slugify(input), expected))
  }

  const koreanCases = [
    ['거래 시간과 주말 공백', 'undefined'],
    ['6. 페그 안정화 모듈(PSM)', 'id-6.-psm'],
    ['1단계: 안정화 풀 스왑', 'id-1'],
    ['RIPE 가치 축적', 'ripe'],
    ['Underscore Earn 볼트 통합', 'underscore-earn'],
    ['GREEN은 어떻게 $1 페그를 유지하나요?', 'green-usd1'],
    ['커뮤니티 인센티브(25% - 2억 RIPE)', 'id-25-2-ripe'],
  ]
  for (const [input, expected] of koreanCases) {
    test(`${JSON.stringify(input)} -> ${expected}`, () => assert.equal(koreanGitBookBase(input), expected))
  }

  test('a punctuation-stripped whitespace run has only the rendered GitBook ID', () => {
    assert.deepEqual(slugVariants('Pay back & withdraw'), ['pay-back-withdraw'])
  })

  test('rejects a Markdown-style fragment variant GitBook does not render', () => {
    const issues = check(withClean({
      'guides/01-one.md': onePage('## Pay back & withdraw\n\n[Jump](#pay-back--withdraw)'),
    }))
    assert.deepEqual(codes(issues), ['broken-anchor'])
  })

  test('a typo in an ambiguous English slug is still caught', () => {
    const issues = check(withClean({
      'guides/01-one.md': onePage('## Pay back & withdraw\n\n[Jump](#pay-back-withdrawl)'),
    }))
    assert.deepEqual(codes(issues), ['broken-anchor'])
  })
})
