import path from 'path'
import fs from 'fs-extra'
import stringify from 'json-stable-stringify'
import { getRepoRoot, getRepoRawRoot } from '@wenyanlang/wyg'
import { packages } from '../registry-packages'
import { RegistryIndex, AuthorInfo } from './types'

const distDir = path.resolve(__dirname, '..', 'dist')

export function BuildIndex (writeToFile = true) {
  const index: RegistryIndex = {
    packages: {},
    alias: {},
  }

  for (const pkg of packages) {
    if (index.packages[pkg.name])
      throw new Error(`Package name ${pkg.name} already exists`)
    if (index.alias[pkg.name])
      throw new Error(`Package name ${pkg.name} conflicted with existing aliases`)

    index.packages[pkg.name] = {
      repo: pkg.repo,
      description: pkg.description,
      entry: `${getRepoRawRoot(pkg.repo)}/序.wy`,
      author: typeof pkg.author === 'string' ? pkg.author : pkg.author?.name,
    }

    if ((pkg.aliases || []).length > 5)
      throw new Error('Up to 5 aliases is allowed for a package')

    for (const alias of pkg.aliases || []) {
      if (index.alias[alias])
        throw new Error(`Alias ${alias} already exists`)
      if (index.packages[alias])
        throw new Error(`Alias ${alias} conflicted with existing package names`)

      index.alias[alias] = pkg.name
    }
  }

  fs.ensureDirSync(distDir)

  if (writeToFile)
    fs.writeFileSync(path.join(distDir, 'index.json'), `${stringify(index)}\n`, 'utf-8')

  return index
}

export function getAuthorMarkdown (author: AuthorInfo) {
  if (typeof author === 'string')
    return author
  else
    return `[${author.name}](${author.url})`
}

export function BuildReadme (writeToFile = true) {
  let readme = '\n\n'

  packages.sort((a, b) => a.name.localeCompare(b.name, 'zh-TW'))

  for (const pkg of packages) {
    let list = `- [${pkg.name}](${getRepoRoot(pkg.repo)})`

    if (pkg.description)
      list += ` - ${pkg.description}`

    if (pkg.author)
      list += ` - by ${getAuthorMarkdown(pkg.author)}`

    readme += `${list}\n`
  }

  readme += '\n'

  if (writeToFile) {
    const readmePath = path.resolve(__dirname, '..', 'README.md')
    const raw = fs.readFileSync(readmePath, 'utf-8')
    const patched = raw.replace(/<!--package_list_start-->[\s\S]*?<!--package_list_end-->/m, `<!--package_list_start-->${readme}<!--package_list_end-->`)
    fs.writeFileSync(readmePath, patched, 'utf-8')
  }

  return readme
}

if (require.main === module) {
  BuildIndex()
  BuildReadme()
}
