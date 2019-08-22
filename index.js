import { promises as fs } from 'fs'
import path from 'path'
import { promisify } from 'util'

import Debug from 'debug'
const debug = Debug('ipld-stac:walk')
import Block from '@ipld/block'
import multicodec from 'multicodec'
import neodoc from 'neodoc'

import { modifyStac } from './modify-stac.js'

const helpText = `
usage: ipld-stac STAC_DIR [OUT_DIR]

arguments:
    STAC_DIR The directory that contains a STAC catalog
    OUT_DIR The directory where the IPLD objects should be stored [default: ./out]
`

// Gets populated by the command line arguments
let out_dir

// Putting it into a local directory
const putData = async (data) => {
  const block = Block.encoder(data, 'dag-cbor')
  const encoded = await block.encode()
  const cid = await block.cid()
  await fs.writeFile(path.join(out_dir, cid.toString('base32')), encoded, {
    encoding: 'binary' })
  return cid
}


/// Check if JSON data is a STAC Catalog or not
const isCatalog = (data) => {
  return !('asset' in data)
}

/// From https://stackoverflow.com/questions/11731072/dividing-an-array-by-filter-function/47225591#47225591
const partition = (list, isValid) => {
  return list.reduce(([pass, fail], elem) => {
    return isValid(elem) ? [[...pass, elem], fail] : [pass, [...fail, elem]]
  }, [[], []])
}

/// Modify the input STAC file to make it work with IPLD
const walk = async (dir) => {
  //console.log(dir)
  const files = await fs.readdir(dir, { withFileTypes: true })
  //const [subs, files] = partition(ls, (file) => file.isDirectory())
  const subs = files.filter((file) => file.isDirectory())
  //console.log('files:', files)
  // There are subdirectories, keep traversing down
  if (subs.length > 0) {
    // The items that will be returned. Keys are the filenames, values are
    // the CIDs of those files
    const items = {}
    // The items of all sub-directories
    // Keys are the filenames, values are the CIDs of those files
    const allsubitems = {}

    for (const sub of subs) {
      // The items are a dictionary with filenames as keys and a CID as value
      const subitems = await walk(path.join(dir, sub.name))

      // Add items from sub-directory to the list of items, so that files
      // referencing those items can use those CIDs
      Object.entries(subitems).forEach(([key, value]) => {
        allsubitems[path.join(sub.name, key)] = value
      })
    }

    // There might be a file in this directory linking to those items of
    // the subdirectory. This is most likely a single `catalog.json` file
    const jsonFiles = files.filter((file) => {
      return file.isFile() && file.name.endsWith('.json')
    })
    for (const jsonFile of jsonFiles) {
      const file = await fs.readFile(path.join(dir, jsonFile.name))
      const data = JSON.parse(file)
      modifyStac(data)
      // There are links to the sub-directories, replace those links with
      // CIDs
      if (data.links.length > 0) {
        data.links = data.links.map((link) => {
          link.href = allsubitems[link.href]
          return link
        })
      }
      const cid = await putData(data)
      items[jsonFile.name] = cid
    }
    //console.log('items2:', items)
    const cidsForLogging = Object.values(items).map((item) => item.toString('base32'))
    console.log('items:', cidsForLogging)

    return items
  } else {
  // There only normal files left, concert those to IPLD objects
    // We only care about the JSON files
    const jsonFiles = files.filter((file) => {
      return file.isFile() && file.name.endsWith('.json')
    })

    // Key is the filename, value is the modified (already adapted for IPLD)
    // contents of the file. This is used to replace the links with the right
    // CIDs
    const filesWithSiblingLinks = {}

    // Key is the filename, value is the CID of that file (encodec as CBOR)
    const items = {}
    for (const jsonFile of jsonFiles) {
      //console.log(jsonFile)
      const file = await fs.readFile(path.join(dir, jsonFile.name))
      const data = JSON.parse(file)
      modifyStac(data)
      // There are no links, hence we can calculate the CID of it right away
      if (data.links.length === 0) {
        //const cid = await toCid(data)
        const cid = await putData(data)
        items[jsonFile.name] = cid
      } else {
      // There are links to other objects that should be stored in IPLD, we
      // can't calculate the CID, before we haven't calculated the CIDs of
      // those file we link to
        filesWithSiblingLinks[jsonFile.name] = data
      }
    }

    // All files we can calculate the CID of should be stored in `items`. We
    // can now loop through the remaining files and replace the links there.
    for (const [name, data] of Object.entries(filesWithSiblingLinks)) {
      data.links = data.links.map((link) => {
        link.href = items[link.href]
        return link
      })
      const cid = await putData(data)
      items[name] = cid
    }
    return items
  }
}

const main = async () => {
  const args = neodoc.run(helpText)

  out_dir = args.OUT_DIR
  // neodoc doesn't support default values for positional arguments
  if (out_dir === undefined) {
    out_dir = './out'
  }

  await fs.mkdir(out_dir, { recursive: true })

  walk(args.STAC_DIR)
}

main(process.argv).catch((error) => {
 console.error(error)
})
