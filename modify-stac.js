import { promises as fs } from 'fs'
import neodoc from 'neodoc'
import Debug from 'debug'
const debug = Debug('ipld-stac')

const helpText = `
usage: ipld-stac.js FILE

arguments:
    FILE The file containing a STAC compatible JSON
`

/// Modify the input STAC file to make it work with IPLD
export const modifyStac = (data) => {
  if ('asset' in data) {
    debug('item file')
  } else {
    debug('catalog file')
  }

  data.links = data.links.reduce((links, link) => {
    switch (link.rel) {
      // `parent`, `root` and `self` are not applicable in IPLD-world
      case 'parent':
      case 'root':
      case 'self':
        break
      case 'child':
      // TODO vmx 2019-05-27: support links to collections, which are absolute
      // URLs in the dataset I use. Deal with that problem somehow.
      //case 'collection':
      case 'item':
        // If no title is given use the filename as the link itself becomes
        // a CID
        if (!('title' in link)) {
          link.title = link.href
          debug(`no title given use file "${link.title}" as title`)
        }
        //link.href = 'some-cid'
        links.push(link)
        break
    }
    return links
  }, []);


  //// Make relative links fixed identifiers, so that they hash always the same
  //for (const link of data.links) {
  //  switch (link.rel) {
  //    case 'self':
  //     //link.href = '.'
  //     link = undefined
  //     break
  //    case 'root':
  //     link.href = '/'
  //     break
  //    case 'parent':
  //     link.href = '..'
  //     break
  //    case 'collection':
  //    case 'item':
  //      // If no title is given use the filename as the link itself becomes
  //      // a CID
  //      if (!('title' in link)) {
  //        const title = link.href.split('/').pop().split('.').shift()
  //        link.title = title
  //        debug(`not title given use file "${title}" as title`)
  //      }
  //      link.href = 'some-cid'
  //      break
  //  }
  //
  //}

  //console.log(data)
}

const main = async () => {
  const args = neodoc.run(helpText)

  const file = await fs.readFile(args.FILE)
  const data = JSON.parse(file)
  modifyStac(data)
}

//main(process.argv).catch((error) => {
// console.error(error)
//})
