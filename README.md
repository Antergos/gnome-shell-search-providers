TheMovieDB Search Provider Extension for GNOME Shell by Antergos

Gnome Shell extension to search for movies in TheMovieDB API.
The search can be made both in your original language or the original movie title. In both cases, the result
will appear with the locale configured in your system.

![Snapshot](http://i.imgur.com/YcVLqkd.png)

Use
====
* Right now, for searching movies, there's a string trigger:

>mv fight club

This is going to be removed in some point, as you don't have to remember string codes when searching for content


TODO
===
* Improve code readability and structure
* Remove string trigger "mv"
* Change result design if possible to show the grid as a card view with big poster, rating, year, name and description,
keeping other Gnome Shell Search Providers showing their content as they do by default.
* Fix bug when the poster is downloaded on cache for the first time, it won't appear until you mouseover the item in
the search result
* Make this Search Provider available to enable/disable from the Gnome Control Center -> Search (like calc, files...)
