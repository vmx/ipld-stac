import { promises as fs } from 'fs'
import path from 'path'

import neodoc from 'neodoc'
import Debug from 'debug'
const debug = Debug('ipld-stac:stac-to-ipld')

const helpText = `
usage: stac-to-ipld.js DIR

arguments:
    DIR The directory to start walking (root of the STAC catalog)
`


/// Modify the input STAC file to make it work with IPLD
const walk = async (dir) => {
  //console.log(dir)
  const files = await fs.readdir(dir, { withFileTypes: true })
  const subs = files.filter((file) => file.isDirectory())
  //console.log('subs:', subs)
  if (subs.length > 0) {
  // There are subdirectories, keep traversing down
    for (const sub of subs) {
      //console.log(sub)
      walk(path.join(dir, sub.name))
    }
  } else {
  // There only normal files left, concert those to IPLD objects
    // We only care about the JSON files
    const jsonFiles = files.filter((file) => {
      return file.isFile() && file.name.endsWith('.json')
    })
    for (const jsonFile of jsonFiles) {
      //console.log(jsonFile)
      const file = await fs.readFile(path.join(dir, jsonFile.name))
      const data = JSON.parse(file)
      const modified = modifyStac(data)
    }
  }
}

const main = async () => {
  const args = neodoc.run(helpText)

  walk(args.DIR)
}

main(process.argv).catch((error) => {
 console.error(error)
})
