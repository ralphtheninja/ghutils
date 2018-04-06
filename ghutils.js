const jsonist = require('jsonist')
    , xtend   = require('xtend')
    , qs      = require('querystring')

    , apiRoot = 'https://api.github.com'


function makeOptions (auth, options) {
  var headers = xtend(
      { 'user-agent' : 'Magic Node.js application that does magic things' }
    , typeof options == 'object' && typeof options.headers == 'object' ? options.headers : {}
  )
  options = xtend({ auth: auth.user + ':' + auth.token }, options)
  options.headers = headers
  return options
}


function handler (callback) {
  return function responseHandler (err, data, res) {
    if (err)
      return callback(err)

    if (data && (data.error || data.message))
      return callback(new Error('Error from GitHub: ' + (data.error || data.message)))

    callback(null, data, res)
  }
}


function ghget (auth, url, options, callback) {
  options = makeOptions(auth, options)

  jsonist.get(url, xtend(options, { followRedirects: true }), handler(callback))
}


function ghpost (auth, url, data, options, callback) {
  options = makeOptions(auth, options)

  jsonist.post(url, data, options, handler(callback))
}


function lister (auth, urlbase, options, callback) {
  var retdata = []
    , afterDate = (options.afterDate instanceof Date) && options.afterDate
    , optqsobj
    , optqs

  // overloading use of 'options' is ... not great
  optqsobj = xtend(options)
  delete optqsobj.afterDate
  delete optqsobj.headers
  optqs = qs.stringify(optqsobj)

  ;(function next (url) {

    if (optqs)
      url += '&' + optqs

	  console.log(url)
    ghget(auth, url, options, function (err, data, res) {
      if (err)
        return callback(err)

      if (data.length)
        retdata.push.apply(retdata, data)

      var nextUrl = getNextUrl(res.headers.link)
        , createdAt

      if (nextUrl) {
        if (!afterDate || (
              (createdAt = retdata[retdata.length - 1].created_at) && new Date(createdAt) > afterDate
            )) {
          return next(nextUrl)
        }
      }

      if (afterDate) {
        retdata = retdata.filter(function (data) {
          return !data.created_at || new Date(data.created_at) > afterDate
        })
      }
      callback(null, retdata)
    })
  }(urlbase))

  function getNextUrl (link) {
    if (typeof link == 'undefined')
      return
    var match = /<([^>]+)>; rel="next"/.exec(link)

    return match && match[1]
  }
}


module.exports.makeOptions = makeOptions
module.exports.ghpost      = ghpost
module.exports.ghget       = ghget
module.exports.handler     = handler
module.exports.lister      = lister
module.exports.apiRoot     = apiRoot
