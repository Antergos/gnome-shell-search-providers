/* TheMovieDB Search Provider for Gnome Shell
 *
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 */

const Lang = imports.lang;
const Soup = imports.gi.Soup;
const Params = imports.misc.params;

const PROTOCOL = 'https';
const BASE_URL = 'api.themoviedb.org';
const API_VERSION = '3';
const API_KEY = '668b45ee89c507efc43cc8eda2f7290c';
const API_PATH = 'search/movie';
const API_POSTER_PATH = 'http://image.tmdb.org/t/p/';
const API_POSTER_DEFAULT_SIZE = 'w185';
const DEFAULT_LANG = 'en';
const LIMIT_VIEW = '10';
const HTTP_TIMEOUT = 10;
const USER_AGENT = 'TheMovieDBSearchProvider extension for GNOME Shell by Antergos';

const IMDB_URL = 'http://www.imdb.com/title/';
const PROVIDER_URL = 'https://www.themoviedb.org/';

/**
 * Client that interacts with TheMovieDB API
 *
 * @class Api
 * @uses imports.gi.Soup
 * @uses imports.misc.params
 */
const Api = new Lang.Class({
    Name: 'Api',

    /**
     * Set default parameters and create a Soup session.
     * @constructor
     * @param {Object} params Parameters
     * @private
     */
    _init: function(params) {
        /**
         * @property {Object} _params
         * @private
         */
        this._params = Params.parse(params, {
            /**
             * @property {String} _params.protocol=PROTOCOL API protocol
             * @accessor
             */
            protocol: PROTOCOL,
            /**
             * @property {String} _params.baseUrl=BASE_URL API base url
             */
            baseUrl: BASE_URL,
            /**
             * @property {String} _params.apiVersion=API_VERSION API version
             */
            apiVersion: API_VERSION,
            /**
             * @property {String} _params.apiKey=API_KEY API key
             */
            apiKey: API_KEY,
            /**
             * @property {String} _params.apiPath=API_PATH API path
             */
            apiPath: API_PATH,
            /**
             * @property {String} _params.apiPosterPath=API_POSTER_PATH API path for images
             */
            apiPosterPath: API_POSTER_PATH,
            /**
             * @property {String} _params.apiPosterSize=API_POSTER_DEFAULT_SIZE API poster default size
             */
            apiPosterSize: API_POSTER_DEFAULT_SIZE,
            /**
             * @property {String} _params.language=DEFAULT_LANG API language
             * @accessor
             */
            language: DEFAULT_LANG,
            /**
             * @property {String} _params.limit=LIMIT_VIEW API result limit to show
             */
            limit: LIMIT_VIEW
        });

        /**
         * @property {Soup.SessionAsync} _session Soup session
         * @private
         */
        this._session = new Soup.SessionAsync();
        Soup.Session.prototype.add_feature.call(
            this._session,
            new Soup.ProxyResolverDefault()
        );
        this._session.user_agent = USER_AGENT;
        this._session.timeout = HTTP_TIMEOUT;
    },

    /**
     * Construct the API URL
     * @returns {String} Language specific API URL that expects a response
     * in JSON
     * @private
     */
    _getApiUrl: function() {
        return '%s://%s/%s/%s?api_key=%s&language=%s'
            .format(PROTOCOL, BASE_URL, API_VERSION, this.apiPath, API_KEY, this.language);
    },

    /**
     * Construct query URL using the API URL and query parameters
     * @param {Object} queryParameters
     * @returns {String} Query URL
     * @private
     */
    _getQueryUrl: function(queryParameters) {
        let queryString = '',
            url = this._getApiUrl(),
            parameter;

        for(parameter in queryParameters) {
            if(queryParameters.hasOwnProperty(parameter)) {
                queryString += '&%s=%s'.format(
                    parameter,
                    encodeURIComponent(queryParameters[parameter])
                )
            }
        }

        url += queryString;

        // Final URL to be queried
        log(url);

        return url;
    },

    /**
     * Query the API
     * @param {Object} queryParameters Query parameters
     * @param {Function} callback Callback that will be called with an
     * error message or a result.
     * @param {null|String} callback.errorMessage Message describing
     * what went wrong
     * @param {Object|null} callback.result Response data parsed in JSON format
     */
    get: function(queryParameters, callback) {
        let queryUrl = this._getQueryUrl(queryParameters),
            request = Soup.Message.new('GET', queryUrl),
            result;

        this._session.queue_message(request,
            Lang.bind(this, function(http_session, message) {
                let errorMessage;

                if(message.status_code !== Soup.KnownStatusCode.OK) {
                    errorMessage = "Api.Client.get: Error code: %s"
                        .format(message.status_code);
                    log(errorMessage);
                    callback(errorMessage, null);
                } else {
                    try {
                        result = JSON.parse(request.response_body.data);
                        callback(null, result);
                    } catch(e) {
                        errorMessage = "Api.Client.get: %s".format(e);
                        log('%s. Response body: %s'
                            .format(errorMessage, request.response_body.data)
                        );
                        callback(errorMessage, null);
                    }
                }
            })
        );
    },


    /**
     * Query the API for item detail
     * @param {int} id Item ID
     * @param {Function} callback Callback that will be called with an
     * error message or a result.
     * @param {null|String} callback.errorMessage Message describing
     * what went wrong
     * @param {Object|null} callback.result Response data parsed in JSON format
     */
    getDetail: function(id, callback) {
        let queryUrl = this._getQueryUrl(''),
            request = Soup.Message.new('GET', queryUrl),
            result;

        this._session.queue_message(request,
            Lang.bind(this, function(http_session, message) {
                let errorMessage;

                if(message.status_code !== Soup.KnownStatusCode.OK) {
                    errorMessage = "Api.Client.get: Error code: %s"
                        .format(message.status_code);
                    log(errorMessage);
                    callback(errorMessage, null);
                } else {
                    try {
                        result = JSON.parse(request.response_body.data);
                        callback(null, result);
                    } catch(e) {
                        errorMessage = "Api.Client.get: %s".format(e);
                        log('%s. Response body: %s'
                            .format(errorMessage, request.response_body.data)
                        );
                        callback(errorMessage, null);
                    }
                }
            })
        );

        // Reset the API PATH to default value for following requests
        this.apiPath = API_PATH;
    },

    /**
     * Search entities
     *
     * @param {String} term Query to search for
     * @param {Function} callback Callback that will be called with an
     * error message or a result.
     * @param {null|String} callback.errorMessage Message describing
     * what went wrong
     * @param {Object|null} callback.result Response data parsed in JSON format
     * @param {Number} [continue_=0] Get results starting at this index
     */
    searchEntities: function (term, callback, continue_) {
        continue_ = continue_ || 0;
        this.get({
            query: term,
            include_adult: '0'
        }, callback);
    },

    searchItemDetails: function (id, callback, continue_) {
        // Set API Path to search for movie details
        this.apiPath = 'movie/' + id;

        continue_ = continue_ || 0;
        this.getDetail(id, callback);
    },

    /**
     * Delete the Soup session
     */
    destroy: function() {
        this._session.run_dispose();
        this._session = null;
    },

    /**
     * Get the API protocol
     * @method getProtocol
     * @returns {String} this._params.protocol
     */
    get protocol() {
        return this._params.protocol;
    },

    get apiPath() {
        return this._params.apiPath;
    },
    set apiPath(path) {
        this._params.apiPath = path;
    },

    /**
     * Get the API language
     * @method getLanguage
     * @returns {String} this._params.language
     */
    get language() {
        return this._params.language;
    },

    /**
     * Set the API language
     * @method getLanguage
     * @param {String} language
     */
    set language(language) {
        this._params.language = language;
    },

    /**
     * Get the default API language
     * @method getDefaultLanguage
     * @returns {String} DEFAULT_LANG
     */
    get defaultLanguage() {
        return DEFAULT_LANG;
    },

    /**
     * Get the default API result limit
     * @method getLimit()
     * @returns {String} LIMIT_VIEW
     */
    get limit() {
        return LIMIT_VIEW;
    },

    set apiPosterSize(size) {
        this._params.apiPosterSize = size;
    },
    get apiPosterSize() {
        return API_POSTER_DEFAULT_SIZE;
    },
    get apiPosterPath() {
        return API_POSTER_PATH;
    },
    get imdbUrl() {
        return IMDB_URL;
    },
    get providerUrl() {
        return PROVIDER_URL;
    }

});
