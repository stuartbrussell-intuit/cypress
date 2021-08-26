// @ts-nocheck
import _ from 'lodash'
import capitalize from 'underscore.string/capitalize'
import methods from 'methods'
import dayjs from 'dayjs'
import $ from 'jquery'

import * as $dom from '../dom'
import * as $jquery from '../dom/jquery'
import * as $Location from './location'

const tagOpen = /\[([a-z\s='"-]+)\]/g
const tagClosed = /\[\/([a-z]+)\]/g
const quotesRe = /('|")/g

const defaultOptions = {
  delay: 10,
  force: false,
  timeout: null,
  interval: null,
  multiple: false,
  waitForAnimations: true,
  animationDistanceThreshold: 5,
  scrollBehavior: 'top',
}

const USER_FRIENDLY_TYPE_DETECTORS = _.map([
  [_.isUndefined, 'undefined'],
  [_.isNull, 'null'],
  [_.isBoolean, 'boolean'],
  [_.isNumber, 'number'],
  [_.isString, 'string'],
  [_.isRegExp, 'regexp'],
  [_.isSymbol, 'symbol'],
  [_.isElement, 'element'],
  [_.isError, 'error'],
  [_.isSet, 'set'],
  [_.isWeakSet, 'set'],
  [_.isMap, 'map'],
  [_.isWeakMap, 'map'],
  [_.isFunction, 'function'],
  [_.isArrayLikeObject, 'array'],
  [_.isBuffer, 'buffer'],
  [_.isDate, 'date'],
  [_.isObject, 'object'],
  [_.stubTrue, 'unknown'],
], ([fn, type]) => {
  return [fn, _.constant(type)]
})

export function warning (msg) {
  // eslint-disable-next-line no-console
  return console.warn(`Cypress Warning: ${msg}`)
}

export function log (...msgs) {
  // eslint-disable-next-line no-console
  return console.log(...msgs)
}

export function monkeypatchBefore (origFn, fn) {
  return function () {
    const newArgs = fn.apply(this, arguments)

    if (newArgs !== undefined) {
      return origFn.apply(this, newArgs)
    }

    return origFn.apply(this, arguments)
  }
}

export function unwrapFirst (val) {
  // this method returns the first item in an array
  // and if its still a jquery object, then we return
  // the first() jquery element
  const item = [].concat(val)[0]

  if ($jquery.isJquery(item)) {
    return item.first()
  }

  return item
}

export function switchCase (value, casesObj, defaultKey = 'default') {
  if (_.has(casesObj, value)) {
    return _.result(casesObj, value)
  }

  if (_.has(casesObj, defaultKey)) {
    return _.result(casesObj, defaultKey)
  }

  const keys = _.keys(casesObj)

  throw new Error(`The switch/case value: '${value}' did not match any cases: ${keys.join(', ')}.`)
}

export function reduceProps (obj, props = []) {
  if (!obj) {
    return null
  }

  return _.reduce(props, (memo, prop) => {
    if (_.has(obj, prop) || obj[prop] !== undefined) {
      memo[prop] = _.result(obj, prop)
    }

    return memo
  }, {})
}

export function normalizeObjWithLength (obj) {
  // lodash shits the bed if our object has a 'length'
  // property so we have to normalize that
  if (_.has(obj, 'length')) {
    obj.Length = obj.length
    delete obj.length
  }

  return obj
}

// return a new object if the obj
// contains the properties of filter
// and the values are different
export function filterOutOptions (obj, filter = {}) {
  _.defaults(filter, defaultOptions)

  this.normalizeObjWithLength(filter)

  const whereFilterHasSameKeyButDifferentValue = (value, key) => {
    const upperKey = capitalize(key)

    return (_.has(filter, key) || _.has(filter, upperKey)) &&
      filter[key] !== value
  }

  obj = _.pickBy(obj, whereFilterHasSameKeyButDifferentValue)

  if (_.isEmpty(obj)) {
    return undefined
  }

  return obj
}

export function stringifyActualObj (obj) {
  obj = this.normalizeObjWithLength(obj)

  const str = _.reduce(obj, (memo, value, key) => {
    memo.push(`${`${key}`.toLowerCase()}: ${this.stringifyActual(value)}`)

    return memo
  }, [])

  return `{${str.join(', ')}}`
}

export function stringifyActual (value) {
  if ($dom.isDom(value)) {
    return $dom.stringify(value, 'short')
  }

  if (_.isFunction(value)) {
    return 'function(){}'
  }

  if (_.isArray(value)) {
    const len = value.length

    if (len > 3) {
      return `Array[${len}]`
    }

    return `[${_.map(value, _.bind(this.stringifyActual, this)).join(', ')}]`
  }

  if (_.isRegExp(value)) {
    return value.toString()
  }

  if (_.isObject(value)) {
    // Cannot use $dom.isJquery here because it causes infinite recursion.
    if (value instanceof $) {
      return `jQuery{${value.length}}`
    }

    const len = _.keys(value).length

    if (len > 2) {
      return `Object{${len}}`
    }

    try {
      return this.stringifyActualObj(value)
    } catch (err) {
      return String(value)
    }
  }

  if (_.isSymbol(value)) {
    return 'Symbol'
  }

  if (_.isUndefined(value)) {
    return undefined
  }

  return `${value}`
}

// give us some user-friendly "types"
export const stringifyFriendlyTypeof = _.cond(USER_FRIENDLY_TYPE_DETECTORS)

export function stringify (values) {
  // if we already have an array
  // then nest it again so that
  // its formatted properly
  values = [].concat(values)

  return _
  .chain(values)
  .map(_.bind(this.stringifyActual, this))
  .without(undefined)
  .join(', ')
  .value()
}

export function stringifyArg (arg) {
  if (_.isString(arg) || _.isNumber(arg) || _.isBoolean(arg)) {
    return JSON.stringify(arg)
  }

  if (_.isNull(arg)) {
    return 'null'
  }

  if (_.isUndefined(arg)) {
    return 'undefined'
  }

  return this.stringifyActual(arg)
}

export function plural (obj, plural, singular) {
  obj = _.isNumber(obj) ? obj : obj.length
  if (obj > 1) {
    return plural
  }

  return singular
}

export function convertHtmlTags (html) {
  return html
  .replace(tagOpen, '<$1>')
  .replace(tagClosed, '</$1>')
}

export function isInstanceOf (instance, constructor) {
  try {
    return instance instanceof constructor
  } catch (e) {
    return false
  }
}

export function escapeQuotes (text) {
  // convert to str and escape any single
  // or double quotes
  return (`${text}`).replace(quotesRe, '\\$1')
}

export function normalizeNumber (num) {
  const parsed = Number(num)

  // return num if this isNaN else return parsed
  if (_.isNaN(parsed)) {
    return num
  }

  return parsed
}

export function isValidHttpMethod (str) {
  return _.isString(str) && _.includes(methods, str.toLowerCase())
}

export function addTwentyYears () {
  return dayjs().add(20, 'year').unix()
}

export function locReload (forceReload, win) {
  return win.location.reload(forceReload)
}

export function locHref (url, win) {
  win.location.href = url
}

export function locToString (win) {
  return win.location.toString()
}

export function locExisting () {
  return $Location.create(window.location.href)
}

export function iframeSrc ($autIframe, url) {
  return $autIframe.prop('src', url)
}

export function getDistanceBetween (point1, point2) {
  const deltaX = point1.x - point2.x
  const deltaY = point1.y - point2.y

  return Math.sqrt((deltaX * deltaX) + (deltaY * deltaY))
}

export function getTestFromRunnable (r) {
  return r.ctx.currentTest || r
}

export function memoize (func, cacheInstance = new Map()) {
  const memoized = function (...args) {
    const key = args[0]
    const { cache } = memoized

    if (cache.has(key)) {
      return cache.get(key)
    }

    const result = func.apply(this, args)

    memoized.cache = cache.set(key, result) || cache

    return result
  }

  memoized.cache = cacheInstance

  return memoized
}

export function indent (str, indentAmount) {
  const indentStr = _.repeat(' ', indentAmount)

  str = str.replace(/\n/g, `\n${indentStr}`)

  return `${indentStr}${str}`
}

// normalize more than {maxNewLines} new lines into
// exactly {replacementNumLines} new lines
export function normalizeNewLines (str, maxNewLines, replacementNumLines) {
  const moreThanMaxNewLinesRe = new RegExp(`\\n{${maxNewLines},}`)
  const replacementWithNumLines = replacementNumLines ?? maxNewLines

  return _.chain(str)
  .split(moreThanMaxNewLinesRe)
  .compact()
  .join(_.repeat('\n', replacementWithNumLines))
  .value()
}

/**
 * Correctly decodes Unicode string in encoded in base64
 * @see https://github.com/cypress-io/cypress/issues/5435
 * @see https://github.com/cypress-io/cypress/issues/7507
 * @see https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
 *
 * @example
  ```
  Buffer.from(JSON.stringify({state: '🙂'})).toString('base64')
  // 'eyJzdGF0ZSI6IvCfmYIifQ=='
  // "window.atob" does NOT work
  // atob('eyJzdGF0ZSI6IvCfmYIifQ==')
  // "{"state":"ð"}"
  // but this function works
  b64DecodeUnicode('eyJzdGF0ZSI6IvCfmYIifQ==')
  '{"state":"🙂"}'
  ```
*/
export function decodeBase64Unicode (str) {
  return decodeURIComponent(atob(str).split('').map((char) => {
    return `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`
  }).join(''))
}

/**
 * Correctly encodes Unicode string to base64
 * @see https://stackoverflow.com/questions/30106476/using-javascripts-atob-to-decode-base64-doesnt-properly-decode-utf-8-strings
*/
export function encodeBase64Unicode (str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, (match, p1) => {
    return String.fromCharCode(`0x${p1}`)
  }))
}

export function noArgsAreAFunction (args) {
  return !_.some(args, _.isFunction)
}

export function isPromiseLike (ret) {
  return ret && _.isFunction(ret.then)
}