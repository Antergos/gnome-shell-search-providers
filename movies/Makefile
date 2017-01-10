# Basic Makefile

UUID = themoviedb-search-provider@antergos.com
TOLOCALIZE = extension.js
MSGSRC = $(wildcard po/*.po)

all: extension

potfile: ./po/themoviedb_search_provider.pot

mergepo: potfile
	for l in $(MSGSRC); do \
		msgmerge -U $$l ./po/wikipedia_search_provider.pot; \
	done;

./po/themoviedb_search_provider.pot: $(TOLOCALIZE)
	mkdir -p po
	xgettext -k_ -kN_ -o po/themoviedb_search_provider.pot --package-name "TheMovieDB Search Provier" $(TOLOCALIZE)

./po/%.mo: ./po/%.po
	msgfmt -c $< -o $@


#What does the first "-" mean at the beginning of the line in a Makefile ?
#It means that make itself will ignore any error code from rm.
#In a makefile, if any command fails then the make process itself discontinues
#processing. By prefixing your commands with -, you notify make that it should
#continue processing rules no matter the outcome of the command.

#mkdir -p, --parents no error if existing, make parent directories as needed
