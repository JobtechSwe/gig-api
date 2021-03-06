const _bodybuilder = require('bodybuilder')
const camelcaseKeys = require('camelcase-keys')
const { indexPrefix } = require('../adapters/elastic')

function setIndexPrefix (index) {
  return index.startsWith(indexPrefix) === false ? `${indexPrefix}${index}` : index
}

const body = (options = {}, { index = 'jobs', type = 'job' } = {}) => {
  const head = {
    index: setIndexPrefix(index),
    type
  }

  if (options) {
    Object.assign(head, options)
  }

  const body = _bodybuilder()
  const __build = body.build

  return Object.assign(body, {
    build: () => Object.assign(head, {
      body: __build.call(body)
    })
  })
}

const raw = (options = {}, { index = 'jobs', type = 'job' } = {}) => {
  const head = {
    index: setIndexPrefix(index),
    type
  }

  return Object.assign(head, options)
}

function onOff (...args) {
  return args.reduce((returnVal, arg) =>
    typeof arg !== 'undefined' ? arg : returnVal, undefined)
}

const functionScore = ({ boost: { mode = 'sum', min, max, boost }, filter = {} }) => {
  min = onOff(min, max, boost)
  max = onOff(max, min, boost)
  boost = onOff(boost, min, max)

  return {
    function_score: {
      boost_mode: mode,
      max_boost: max,
      boost: boost,
      min_score: min,
      query: {
        bool: {
          must: {
            match_all: {}
          },
          filter
        }
      }
    }
  }
}

const refresh = (options = {}, { index = 'jobs' } = {}) => {
  return Object.assign({}, options, {
    index: setIndexPrefix(index)
  })
}

const toDoc = (hit = { _source: {}, _id: null }) =>
  Object.assign({}, hit._source, { id: hit._id })

const toDocs = (hits = []) =>
  hits.map(toDoc)

const toDocCamelCased = (hit = { _source: {}, _id: null }) =>
  camelcaseKeys(toDoc(hit))

const toDocsCamelCased = (hits = []) =>
  hits.map(hit =>
    camelcaseKeys(toDoc(hit)))

module.exports = {
  raw,
  body,
  functionScore,
  refresh,
  toDoc,
  toDocs,
  toDocCamelCased,
  toDocsCamelCased
}
