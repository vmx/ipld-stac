STAC on IPLD
============

Store your [STAC](https://stacspec.org/) catalog in IPLD.

At the moment it stores CBOR encoded files in a single directory, where the filename is the base21 encoded CID of the file contents.

Install
-------

```console
$ git clone https://github.com/vmx/ipld-stac.git
$ cd ipld-stac
$ npm install
```


Usage
-----

You need Node.js >= 12.0 in order to run this project.

```console
$ NODE_OPTIONS=--experimental-modules node index.js <your-stac-catalog>
root CID: bafyreiaziuhfjbaeeyrs6n5b77vqnpmpzhtxtaobnfhdalqhjxjwcg6l2i
```

Your catalog will be stored at a directory called `out` relative to your current work directory.


License
-------

This project is dual-licensed under Apache 2.0 and MIT terms:

- Apache License, Version 2.0, ([LICENSE-APACHE](LICENSE-APACHE) or http://www.apache.org/licenses/LICENSE-2.0)
- MIT license ([LICENSE-MIT](LICENSE-MIT) or http://opensource.org/licenses/MIT)
