// Based on Split by Name Webpack Plugin – https://github.com/soundcloud/split-by-name-webpack-plugin

function regExpQuote(str) {
  return (str + '').replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, '\\$&');
}
var nextIdent = 0;

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

  this.ident = __filename + (nextIdent++);
}

SplitByPathPlugin.prototype.apply = function (compiler) {
  var buckets = this.buckets;
  var ignore = this.ignore;
  var ignoreChunks = this.ignoreChunks;
  var ident = this.ident;

  compiler.plugin('this-compilation', function (compilation) {
    compilation.plugin('optimize-modules', function (modules) {
      // Only run once
      if(compilation[ident]) return;
      compilation[ident] = true;

      var bucketChunks = [].concat(buckets).map(function(bucket) {
        var chunk = this.addChunk(bucket.name);
        chunk.entry = chunk.initial = true;
        bucket.chunk = chunk;
        return chunk;
      }, this);

      modules.forEach(function processModule(module) {
        var processChunks = module.chunks.filter(function filterIgnoreChunks(chunk) {
          return bucketChunks.indexOf(chunk) < 0 && ignoreChunks.indexOf(chunk.name) < 0;
        });
        var bucket = findMatchingBucket(module, ignore, buckets);

        if (!bucket || processChunks.length === 0) {
          // the module stays in the original chunk
          return;
        }

        bucket.chunk.addModule(module);
        module.addChunk(bucket.chunk);

        // Removed processed chunks
        processChunks.forEach(function removeProcessedChunk(chunk) {
          chunk.parents = [bucket.chunk];
          bucket.chunk.chunks.push(chunk);
          chunk.entry = false;
        });
      });

      this.restartApplyPlugins();
    });
    compilation.plugin('optimize-chunks', function () {
      var bucketChunks = [].concat(buckets).map(function(bucket) {
        var chunk = this.addChunk(bucket.name);
        chunk.entry = chunk.initial = true;
        bucket.chunk = chunk;
        return chunk;
      }, this);

      // Check for any bucket chunks that were emptied by other optimization plugins
      bucketChunks.forEach(function checkBucketChunkEmpty(bucketChunk) {
        if (bucketChunk.isEmpty()) {
          // Set bucket chunk initial to false to allow RemoveEmptyChunksPlugin to remove the chunk
          bucketChunk.initial = false;
        }
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
