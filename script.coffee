###

Crew To Play

by Thai Pangsakulyanont (dtinth)
http://github.com/dtinth/crew-standings

MIT License
http://creativecommons.org/licenses/MIT/

###

# has3d from iScroll.js
has3d = `('WebKitCSSMatrix' in window && 'm11' in new WebKitCSSMatrix())`

djmaxcrew_xpath = '//table[@width="960"]//table[@width="960"]//table[@width="960" and not(@height)]//table[@width="960"]//td[@width="725"]'
djmaxcrew_base = 'http://djmaxcrew.com'

yql_base_uri = 'http://query.yahooapis.com/v1/public/yql'
yql_cache_time = 1800

yql = do ->
	counter = 0
	return (query, callback) ->
		description = 'cb' + (++counter)
		cb_name = 'window.yql_cb.' + description
		if not window.yql_cb?
			window.yql_cb = {}
		window.yql_cb[description] = callback
		url = yql_base_uri + '?q=' + encodeURIComponent(query) + '&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys&callback=' + encodeURIComponent(cb_name) + '&_maxage=' + yql_cache_time
		sc = document.createElement 'script'
		sc.src = url
		document.body.appendChild sc

fetch = (url, callback) ->
	query = 'select * from htmlstring where xpath=\'' + djmaxcrew_xpath + '\' and url=\'' + url + '\''
	yql query, callback

$ize = (fn) ->
	return (data) ->
		fn $ data.query.results.result

fetchDoc = (url, callback) ->
	fetch url, $ize callback

parseFileName = (url) ->
	url.replace(/^[\s\S]*\//, '').replace(/.[^.]+$/, '')

parseText = (text) ->
	text.replace(/^\s+/, '').replace(/\s+$/, '').replace(/\s+/g, ' ')

parseNumber = (number) ->
	parseFloat (number + '').replace(/[^0-9\.]/g, '')

parseIntNumber = (number) ->
	parseInt (number + '').replace(/[^0-9]/g, ''), 10

resize = (fn) ->
	window.addEventListener 'resize', fn, false
	window.addEventListener 'orientationchange', fn, false
	display fn

display = (fn) ->
	setTimeout fn, 0

jQuery.fn.tappable = ->
	$fe = (e) ->
		for point in e.changedTouches
			el = point.target
			while el and el != document.body
				if el.hasAttribute and el.hasAttribute('data-tappable')
					return $(el)
				el = el.parentNode
		return
	this.each ->
		down = (e) ->
			el = $fe(e)
			if el then el.addClass('tapping')
		up = (e) ->
			el = $fe(e)
			if el then el.removeClass('tapping')
		this.addEventListener 'touchstart', down, false
		this.addEventListener 'touchcancel', up, false
		this.addEventListener 'touchend', up, false
	
	return this


class Loader

	constructor: ->
		@totalObjects = 0
		@loadedObjects = 0
		@progress = 0
		@element = $('<div class="progress-bar"></div>').appendTo(@container = $('<div class="progress-bar-container"></div>').appendTo '#main')

	onfinish: ->

	addObject: ->
		@totalObjects++

	addProgress: ->
		if @totalObjects > 0
			@loadedObjects++
			startPosition = if @loadedObjects > 1 then 1 - (1 - @progress) * (@totalObjects / (@totalObjects - @loadedObjects + 1)) else 0
			endPosition = 1
			@progress = startPosition + (@loadedObjects / @totalObjects) * (endPosition - startPosition)
			if @loadedObjects == @totalObjects
				@element.css
					'-moz-transition': 'width 0.3s linear'
					'-webkit-transition': 'width 0.3s linear'
					'-ms-transition': 'width 0.3s linear'
					'-o-transition': 'width 0.3s linear'
					'transition': 'width 0.3s linear'
				@container.delay(1500).fadeOut('slow')
				@onfinish()
			@element.css 'width', Math.pow(@progress, 2) * 100 + '%'



courses = []
songMap = {}
songs = []
patternMap = {}
patterns = []
difficultyMap = {}

parseSong = (img) ->
	filename = parseFileName img
	filename2 = filename.replace /^@/, ''
	underscore = filename2.lastIndexOf '_'
	if underscore > -1
		return {
			fileName: filename
			song: filename2.substr 0, underscore
			pattern: parseNumber filename2.substr underscore
		}
	else
		null

addSongInfo = (course, song) ->
	songMap[song.song] = song.fileName
	difficultyMap[song.song + '_' + song.pattern] = song.fileName
	patternMap[song.fileName] = 1

class CrewPanel

	getImageCode     = (fileName) -> """<img width="42" height="42" src="http://images.djmaxcrew.com/Technika2/EN/icon/technika2/disc_s/#{fileName}.png">"""
	getSongNameImage = (songName) -> getImageCode songMap[songName].replace(/_[1234]$/, '_0')
	getSongImage     = (song)     -> getImageCode song.fileName

	constructor: (@delegate, @index) ->

		@element = $('<div class="panel panel-' + @index + '"></div>')
		@content = $('<div class="panel-content"></div>').appendTo(@element)
		@view = $('<div class="panel-view"></div>').appendTo($('<div class="panel-clip"></div>').appendTo(@content))
		@criteria = null
		@showing = false

		@initSongList()
		@initCourseList()
		@scrollTo @songListPanel
		resize =>
			@scrollTo @anchor
	
	scrollTo: (@anchor) ->
		
		left = -@anchor[0].offsetLeft

		if has3d
			@view.css '-webkit-transform', 'translate3d(' + left + 'px,0,0)'
		else
			@view.css 'left', left + 'px'

	initSongList: ->

		@songListPanel = $('''<div class="sub-panel">
			<h1>Select Song</h1>
			<div class="listbox songlist">
				<div class="listbox-content"></div>
			</div>
		</div>''').appendTo(@view)

		songListBoxContent = @songListPanel.find '.listbox-content'
		songListBox = @songListPanel.find '.listbox'
		songListH1 = @songListPanel.find 'h1'
		html = ''

		for songName in songs
			html += """<div class="listitem songitem" data-tappable="true" data-song="#{songName}">
				#{getSongNameImage(songName)} #{songName}
			</div>"""
		songListBoxContent.append html

		display =>
			new iScroll(songListBoxContent.tappable()[0])

		songListBoxContent.click (e) =>

			if @showing
				return

			el = e.target
			while el and el != songListBoxContent[0]
				if el.hasAttribute('data-song')
					el = $ el
					el.addClass 'selected'

					@criteria =
						song: el.data 'song'
						hide: {}
					@showing = true
					@delegate.update()
					@selected = el

					@scrollTo @courseListPanel
					break
				el = el.parentNode
			return false

	initCourseList: ->

		@courseListPanel = $('''<div class="sub-panel">
			<h1>N Courses</h1>
			<div class="back" data-tappable="true">Songs</div>
			<div class="listbox courselist">
				<div class="listbox-content"></div>
			</div>
		</div>''').appendTo(@view)

		content = @courseListPanel.find('.listbox-content')[0]

		@courseListPanel.find('.back').click (e) =>

			if not @showing
				return
				
			if @selected
				@selected.removeClass 'selected'
			@selected = null
			@criteria = null
			@showing = false
			@scrollTo @songListPanel
			@delegate.update()
			return false

		$(content).click (e) =>

			if not @showing
				return

			el = e.target
			while el and el != content
				if el.hasAttribute('data-difficulty')
					difficulty = el.getAttribute('data-difficulty')
					if @criteria.hide[difficulty]
						delete @criteria.hide[difficulty]
					else
						@criteria.hide[difficulty] = 1
					@delegate.update()
					break
				else if el.hasAttribute('data-course')
					break
				el = el.parentNode
			return false

		display =>
			new iScroll content

	difficultyNameMap =
		'0': '--'
		'1': 'NM'
		'2': 'HD'
		'3': 'MX'
		'4': 'SC'

	update: ->

		if not @showing
			return

		songName = @criteria.song
		
		difficultyList = ''

		for difficulty in [0..4]
			if difficultyMap[songName + '_' + difficulty]
				difficultyList += """<div data-tappable="true" class="difficulty #{if difficulty of @criteria.hide then "off" else "on"}" data-difficulty="#{difficulty}">#{difficultyNameMap[difficulty]}</div>"""

		html = """<div class="listitem songitem" data-song="#{songName}">
			#{getSongNameImage(songName)} #{songName}
			<div class="difficulties">#{difficultyList}</div>
		</div>"""

		found = 0
		for course in courses
			if @delegate.panelShouldShowCourse(@, course)
				found++
				highlight = (if @delegate.panelShouldHighlightCourse(@, course) then " highlighted" else "")
				html += """<div class="listitem courseitem#{highlight}" data-course="#{course.name}">
					<span class="rank">#{course.rank}</span>
					#{course.name}
					<div class="songs">
						#{getSongImage(course.song1)}
						#{getSongImage(course.song2)}
						#{getSongImage(course.song3)}
					</div>
				</div>"""

		@courseListPanel.find('h1').html "#{found} Course#{if found == 1 then '' else 's'}"
		@courseListPanel.find('.listbox-content').html html

class Viewport
	
	constructor: (panels) ->
		
		@element = $('<table class="viewport"><tr></tr></table>').appendTo '#main'
		@tr = @element.find 'tr'
		@tds = {}
		@displayPanels panels
		@resize
	
	getTD: (i) ->
		if not @tds[i]?
			@tds[i] = $('<td class="column"><div class="column-content"></div></td>').appendTo(@tr).find('.column-content')
			resize =>
				@tds[i].css 'height', window.innerHeight + 'px'
		return @tds[i]

	displayPanels: (panels) ->
		
		@panels = panels
		index = 0
		for panel in @panels
			@getTD(index).append panel.element
			index++


class App

	constructor: ->
		iScroll.options.scrollbarColor = 'rgba(255,255,255,0.5)'
		@loader = new Loader()
		@loader.onfinish = =>
			@loaded()
		@loadWeekly 1
		@loadWeekly 2
		@loadWeekly 3, true

		cancel = (e) ->
			e.preventDefault()

		up = (e) ->
			# taken from iScroll.js
			ev = document.createEvent('MouseEvents')
			for point in e.changedTouches
				ev.initMouseEvent('click', true, true, e.view, 1,
					point.screenX, point.screenY, point.clientX, point.clientY,
					e.ctrlKey, e.altKey, e.shiftKey, e.metaKey,
					0, null)
				ev._fake = true
				point.target.dispatchEvent(ev)
			e.preventDefault()

		$(document).tappable()

		document.addEventListener 'touchstart', cancel, false
		document.addEventListener 'touchmove', cancel, false
		document.addEventListener 'touchend', up, false

	loaded: ->
		for songName of songMap
			songs.push songName
		for patternName of patternMap
			patterns.push patternName
		songs.sort()
		patterns.sort()
		courses.sort((a, b) -> a.rank - b.rank)
		@panels = []
		for i in [1..3]
			@panels.push new CrewPanel @, i
		@viewport = new Viewport(@panels)

	update: ->
		for panel in @panels
			panel.update()

	panelShouldShowCourse: (panel, course) ->
		if panel.criteria
			for song in [course.song1, course.song2, course.song3]
				if panel.criteria.song == song.song
					if not panel.criteria.hide[song.pattern]
						return true
		return false

	panelShouldHighlightCourse: (panel, course) ->
		score = 0
		for panel in @panels
			if panel.criteria
				score += (if @panelShouldShowCourse(panel, course) then 1 else 0)
			else
				score++
		return score == @panels.length

	loadWeekly: (page, loadNext = false) ->
		@loader.addObject()
		fetchDoc djmaxcrew_base + '/crewrace/crewrace_ing.asp?page=' + page, (doc) =>
			found = false
			for tr in doc.find 'tr'
				tr = $ tr
				if tr.find('> td[height="40"] + td[width="10"]').length > 0
					info =
						name:       parseText      tr.find('> td[width="170"] .text11_4_b').text()
						plate:      parseFileName  tr.find('table[width="30"][height="30"][background]').attr('background')
						pattern:    parseFileName  tr.find('table[width="30"][height="30"][background] img').attr('src')
						points:     parseIntNumber tr.find('> td[width="170"] .text11_gray').text()
						producer:   parseText      tr.find('td[width="134"] .text11_4_b').text()
						song1:      parseSong      tr.find('td[width="52"] img').eq(0).attr('src')
						song2:      parseSong      tr.find('td[width="52"] img').eq(1).attr('src')
						song3:      parseSong      tr.find('td[width="52"] img').eq(2).attr('src')
						rank:       parseNumber    tr.find('> td[width="70"] span.text11_4_b').text()
					addSongInfo info, info.song1
					addSongInfo info, info.song2
					addSongInfo info, info.song3
					courses.push info
					found = true
			if found and loadNext
				@loadWeekly page + 1, true
			@loader.addProgress()

	@main = => new @

$ ->
	App.main()
