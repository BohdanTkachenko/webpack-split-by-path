// Based on Split by Name Webpack Plugin – https://github.com/soundcloud/split-by-name-webpack-plugin

var Entrypoint = require('webpack/lib/Entrypoint');

function regExpQuote(str) {
  return (str + '').replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}

/**
 * @name Bucket
 * @property {String} name
 * @property {Array<String|RegExp>} path
 */

/**
 *
 * @param {Bucket[]} buckets - instances of Bucket
 * @param {Object} config - configurable options include:
 * <pre>
 * {
 *    ignore: string[],
 *    ignoreChunks: string[]
 *    manifest: string
 * }
 * </pre>
 * @constructor
 */
function SplitByPathPlugin(buckets, config) {
  config = config || {};
  config.ignore = config.ignore || [];
  config.ignoreChunks = config.ignoreChunks || [];

  if (!Array.isArray(config.ignore)) {
    config.ignore = [config.ignore];
  }

  if (!Array.isArray(config.ignoreChunks)) {
    config.ignoreChunks = [config.ignoreChunks];
  }

  this.ignore = config.ignore.map(function (item) {
    if (item instanceof RegExp) {
      return item;
    }

    return new RegExp('^' + regExpQuote(item));
  });

  this.ignoreChunks = config.ignoreChunks;
  this.manifest = config.manifest || 'manifest';

  // buckets mean each bucket holds a pile of module, which is the same concept as chunk
  this.buckets = buckets.slice(0).map(function (bucket) {
    if (!Array.isArray(bucket.path)) {
      bucket.path = [bucket.path];
    }

    bucket.path = bucket.path.map(function (path) {
      if (path instanceof RegExp) {
        return path;
      }

      return new RegExp('^' + regExpQuote(path));
    });

    return bucket;
  });
}

SplitByPathPlugin.prototype.apply = function (compiler) {
  var buckets = this.buckets;
  var ignore = this.ignore;
  var ignoreChunks = this.ignoreChunks;
  var manifestName = this.manifest;

  compiler.plugin('this-compilation', function (compilation) {
    var extraChunks = {};

    // Find the chunk which was already created by this bucket.
    // This is also the grossest function name I've written today.
    function bucketToChunk(bucket) {
      return extraChunks[bucket.name];
    }

    compilation.plugin('optimize-chunks', function (chunks) {

      var addChunk = this.addChunk.bind(this);

      // retrieve the entry chunks, so we can reform them
      var entryChunks = chunks
        .filter(function (chunk) {
          // only parse the entry chunk
          return chunk.hasRuntime() && chunk.name && ignoreChunks.indexOf(chunk.name) === -1;
        })
        .map(function (chunk) {
          chunk.modules
            .slice()
            .forEach(function (mod) {
              var bucket = findMatchingBucket(mod, ignore, buckets);
              var newChunk;

              if (!bucket) {
                // the module stays in the original chunk
                return;
              }

              newChunk = bucketToChunk(bucket)
              if (!newChunk) {
                newChunk = extraChunks[bucket.name] = addChunk(bucket.name);
                var entrypoint = new Entrypoint(bucket.name);
                entrypoint.chunks.push(newChunk);
                newChunk.entrypoints = [entrypoint];
              }

              // add the module to the new chunk
              newChunk.addModule(mod);
              mod.addChunk(newChunk);
              // remove it from the existing chunk
              mod.removeChunk(chunk);
            });

          return chunk
        });

      var notEmptyBucketChunks = buckets.map(bucketToChunk).filter(Boolean);

      // create the manifest chunk which displays as the only entry chunk.
      // it's a little buggy when works with multiple entry specified at entry option
      // because you have to load the script similar in `the example/app.html`
      // Therefore, in the manifest output file, there is some additional information
      // (the manifest list) for the target page.

      var manifestChunk = addChunk(manifestName);
      manifestChunk.chunks = notEmptyBucketChunks.concat(entryChunks);

      manifestChunk.chunks.forEach(function (chunk) {
        chunk.parents = [manifestChunk];
        chunk.entrypoints.forEach(function (ep) {
          ep.insertChunk(manifestChunk, chunk);
        });
        manifestChunk.addChunk(chunk);
      });
    });
  });
};

module.exports = SplitByPathPlugin;

/**
 * test the target module whether it matches one of the user specified
 * bucket paths
 *
 * @param {Module} mod
 * @param {String[]} ignore
 * @param {Bucket[]} bucketsContext
 * @returns {Bucket}
 */
function findMatchingBucket(mod, ignore, bucketsContext) {
  var match = null;

  if (!mod.resource) {
    return match;
  }

  var resourcePath = mod.resource;
  for (var i in ignore) {
    if (ignore[i].test(resourcePath)) {
      return match;
    }
  }

  bucketsContext.some(function (bucket) {
    return bucket.path.some(function (path) {
      if (path.test(resourcePath)) {
        match = bucket;
        return true;
      }
    });
  });

  return match;
}
