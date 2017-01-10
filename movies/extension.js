/* TheMovieDB Search Provider for Gnome Shell
 *
 *
 * This program is free software; you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation; either version 3 of the License, or
 * (at your option) any later version.
 *
 */

const Main = imports.ui.main;
const Mainloop = imports.mainloop;
const Gio = imports.gi.Gio;
const Lang = imports.lang;
const Util = imports.misc.util;
const Soup = imports.gi.Soup;
const Glib = imports.gi.GLib;
const St = imports.gi.St;

const Me = imports.misc.extensionUtils.getCurrentExtension();
const Api = Me.imports.api;

const Gettext = imports.gettext.domain('themoviedb_search_provider');
const _ = Gettext.gettext;

const CACHE_FOLDER = '.cache/antergos-search-providers-gnome';

const TheMovieDBSearchProvider = new Lang.Class({
    Name: 'TheMovieDBSearchProvider',

    _init: function() {
        let self = this;

        // Create cache
        let cache_folder = Gio.file_new_for_path(CACHE_FOLDER);
        if (!cache_folder.query_exists(null)) {
            cache_folder.make_directory(null);
        }


        // Use the default app for opening https links as the app for
        // launching full search.
        this.appInfo = Gio.AppInfo.get_default_for_uri_scheme('https');
        // Fake the name and icon of the app
        this.appInfo.get_name = function() {
            return _('TheMovieDB Search Provider');
        };
        this.appInfo.get_icon = function() {
            return Gio.icon_new_for_string(Me.path + "/movies.svg");
        };

        // Custom messages that will be shown as search results
        this._messages = {
            '__loading__': {
                id: '__loading__',
                name: 'TheMovieDB',
                description : _('Loading items from TheMovieDB, please wait...'),
                createIcon: Lang.bind(this, this.createIcon, {})
            },
            '__error__': {
                id: '__error__',
                name: 'TheMovieDB',
                description : _('Oops, an error occurred while searching.'),
                createIcon: Lang.bind(this, this.createIcon, {})
            }
        };
        // API results will be stored here
        this.resultsMap = new Map();
        this._api = new Api.Api();
		// Wait before making an API request
		this._timeoutId = 0;


        // Configure default language for results
        this._current_language_code_large = Glib.getenv('LANG');
        this._language = this._current_language_code_large.substr(0, 2);

        // Set user's home PATH
        this._home_path = Glib.getenv('HOME');
    },


    /**
     * Search API if the query is a TheMovieDB query.
     * TheMovieDB query must start with a 'wd' as the first term.
     * @param {Array} terms
     * @param {Function} callback
     * @param {Gio.Cancellable} cancellable
     */
    getInitialResultSet: function(terms, callback, cancellable) {
        let meta;
        // terms holds array of search items
        // The first term must start with a 'wd' (=wikidata).
        // It can be of the form 'wd', 'wd-en', 'wd-ru'. The part after
        // the dash is the search language.
        if (terms.length >= 2 && terms[0].substr(0, 2) === 'mv') {
            // show the loading message
            this.showMessage('__loading__', callback);
            // remove previous timeout
            if (this._timeoutId > 0) {
                Mainloop.source_remove(this._timeoutId);
                this._timeoutId = 0;
            }

            // wait 0.2 seconds before making an API request
            this._timeoutId = Mainloop.timeout_add(1000, Lang.bind(this, function() {
                // set the language
                if (this._language){
                    this._api.language = this._language;
                } else {
                    this._api.language = this._api.defaultLanguage;
                }

                // now search
                this._api.searchEntities(
                    this._getQuery(terms),
                    Lang.bind(this, this._getResultSet, callback, this._timeoutId)
                );
            }));
        } else {
            // return an emtpy result set
            this._getResultSet(null, {}, callback, 0);
        }
    },


    /**
     * @param {Array} previousResults
     * @param {Array} terms
     * @returns {Array}
     */
    getSubsetResultSearch: function (previousResults, terms, callback) {
        let meta;
        // terms holds array of search items
        // The first term must start with a 'wd' (=wikidata).
        // It can be of the form 'wd', 'wd-en', 'wd-ru'. The part after
        // the dash is the search language.
        if (terms.length >= 2 && terms[0].substr(0, 2) === 'mv') {
            // show the loading message
            this.showMessage('__loading__', callback);
            // remove previous timeout
            if (this._timeoutId > 0) {
                Mainloop.source_remove(this._timeoutId);
                this._timeoutId = 0;
            }

            // wait 0.2 seconds before making an API request
            this._timeoutId = Mainloop.timeout_add(1000, Lang.bind(this, function() {
                // set the language
                if (this._language){
                    this._api.language = this._language;
                } else {
                    this._api.language = this._api.defaultLanguage;
                }

                // now search
                this._api.searchEntities(
                    this._getQuery(terms),
                    Lang.bind(this, this._getResultSet, callback, this._timeoutId)
                );
            }));
        } else {
            // return an emtpy result set
            this._getResultSet(null, {}, callback, 0);
        }
    },


    /**
     * Run callback with results
     * @param {Array} identifiers
     * @param {Function} callback
     */
    getResultMetas: function(identifiers, callback) {
        let metas = [];
        for (let i = 0; i < identifiers.length; i++) {
            metas.push(this._getResultMeta(identifiers[i]));
        }
        callback(metas);
    },


    /**
     * Return meta from result
     * @param {String} identifier
     * @returns {{id: String, name: String, description: String, createIcon: Function}}
     * @private
     */
    _getResultMeta: function(identifier, callback) {
        let result,
            meta;

        // return predefined message if it exists
        if (identifier in this._messages) {
            result = this._messages[identifier];
        } else {
            meta = this.resultsMap.get(identifier);

            let apiPosterPath = this._api.apiPosterPath,
                apiPosterSize = this._api.apiPosterSize;

            let icon_path = meta.poster_path ? meta.poster_path : '',
                icon_url = meta.poster_path ? apiPosterPath + '/' + apiPosterSize + '/' + meta.poster_path : '',
                release_date = meta.release_date.split("-");

            result = {
                id: meta.id,
                name: meta.title + ' (' + release_date[0] + ')',
                description : meta.overview,
                createIcon: Lang.bind(this, this._cachePoster, icon_path, icon_url, callback)
            };
        }
        return result;
    },


    /**
     * Launch the search in the default app (i.e. browser)
     */
    launchSearch: function () {
        Util.trySpawnCommandLine(
            "xdg-open " + this._api.providerUrl);
    },

    /**
     * Open the url in default app
     * @param {String} identifier
     * @param {Array} terms
     * @param timestamp
     * @param callback
     */
    activateResult: function(identifier, terms, timestamp, callback) {
        let item_id;
        let item_detail;

        // only do something if the result is not a custom message
        if (!(identifier in this._messages)) {
            item = this.resultsMap.get(identifier);

            this._api.searchItemDetails(
                item.id,
                Lang.bind(this, this._openLink, callback, this._timeoutId)
            );
        }
    },


    /**
     * Show any message as a search item
     * @param {String} identifier Message identifier
     * @param {Function} callback Callback that pushes the result to search
     * overview
     */
    showMessage: function (identifier, callback) {
        callback([identifier]);
    },


    /**
     * Return subset of results
     * @param {Array} results
     * @param {number} max
     * @returns {Array}
     */
    filterResults: function(results, max) {
        // override max for now
        max = this._api.limit;
        return results.slice(0, max);
    },



    /**
     * Return query string from terms array
     * @param {String[]} terms
     * @returns {String}
     */
    _getQuery: function(terms) {
        return terms.slice(1).join(' ');
    },


    /**
     * Parse results that we get from the API and save them in this.resultsMap.
     * Inform the user if no results are found.
     * @param {null|String} error
     * @param {Object|null} result
     * @param {Function} callback
     * @param {Function} timeoutId
     * @private
     */
    _getResultSet: function (error, result, callback, timeoutId) {
        let self = this,
            results = [];

        if (timeoutId === this._timeoutId && result.results && result.results.length > 0) {
            result.results.forEach(function (result) {
                self.resultsMap.set(result.id, result);
                results.push(result.id);
            });
            callback(results);
        } else if (error) {
            // Let the user know that an error has occurred.
            log(error);
            this.showMessage('__error__', callback);
        } else {
            callback(results);
        }

    },


    _openLink: function(error, result) {
        if (result) {
            Util.trySpawnCommandLine(
                "xdg-open " + this._api.imdbUrl + result.imdb_id + '/');
        }
    },


    /**
     * Create meta icon
     * @param size
     * @param {Object} meta
     */
    createIcon: function (size, meta) {
        // TODO: implement meta icon?
    },

    _cachePoster: function (object, image_name, url, callback) {
        let _httpSession = new Soup.SessionAsync();

        if(url && typeof url === 'string' && image_name !== '') {
            Soup.Session.prototype.add_feature.call(_httpSession, new Soup.ProxyResolverDefault());

            // open the file
            let file = Gio.file_new_for_path(this._home_path + '/' + CACHE_FOLDER + image_name);

            if(!file.query_exists(null)) {
                let fstream = file.replace(null, false, Gio.FileCreateFlags.NONE, null);

                let request = Soup.Message.new('GET', url);
                request.connect('got_chunk', Lang.bind(this, function(message, chunk){
                    // write each chunk to file
                    fstream.write(chunk.get_data(), null, chunk.length);
                }));

                _httpSession.queue_message(request, function(_httpSession, message) {
                    // close the file
                    fstream.close(null);
                });
                return new St.Icon({ gicon: Gio.icon_new_for_string(this._home_path + '/' + CACHE_FOLDER + image_name), style_class: 'movie-poster'});
            }else {
                log('File exists on cache for image name: %s'.format(image_name));

                return new St.Icon({ gicon: Gio.icon_new_for_string(this._home_path + '/' + CACHE_FOLDER + image_name), style_class: 'movie-poster'});
            }

        }
    }
});

let theMovieDBSearchProvider = null;

function init() {
    /** noop */
}

function enable() {
    if (!theMovieDBSearchProvider) {
        theMovieDBSearchProvider = new TheMovieDBSearchProvider();
        Main.overview.viewSelector._searchResults._registerProvider(
            theMovieDBSearchProvider
        );
    }
}

function disable() {
    if (theMovieDBSearchProvider){
        Main.overview.viewSelector._searchResults._unregisterProvider(
            theMovieDBSearchProvider
        );
        theMovieDBSearchProvider = null;
    }
}

