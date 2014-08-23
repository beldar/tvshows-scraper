/* globals console, require */

var app         = require('express')(),
    http        = require('http').Server(app),
    port        = 80,
    scraperjs   = require('scraperjs'),
    rss         = require('rss'),
    moment      = require('moment'),
    feed;

app.get('/feed/:tvshow/:user?', function(req, res) {
    if (typeof req.param('tvshow') === 'undefined') {
        res.redirect('/');
        return;
    }
    var fullUrl = req.protocol + '://' + req.get('host') + req.originalUrl,
        tvshow = req.param('tvshow'),
        user = req.param('user') || '',
        term = encodeURIComponent(tvshow),
        url  = 'https://thepiratebay.se/search/'+term+'/0/3/0';

    feed = new rss({
        title: tvshow,
        description: 'Episodes for '+tvshow,
        generator: 'beldar',
        feed_url: fullUrl,
        site_url: url,
        pubDate: new Date()
    });

    scrapUrl(url, res, user);
});

app.get('*', function(req, res) {
    res.status(404);
    res.send('Invalid parameters');
});

http.listen(port, function(){
    console.log('listening on *:'+port);
});

function scrapUrl (url, res, user) {
    return scraperjs.StaticScraper.create(url)
    .scrape(function($) {
        return $("#searchResult tr").map(function() {
            var name = $(this).find('.detName a').text(),
                link = $(this).find('a').eq(3).attr('href'),
                meta =  $(this).find('font.detDesc').text();

            if( name === '' || link === '' || meta === '')
                return;

            var author = meta.split('ULed by ')[1],
                datestr = meta.split(',')[0].split('Uploaded ')[1].replace('Y-day', 'Yesterday'),
                date = datestr.match(/Yesterday/) !== null ? moment().substract('days', 1) : moment(datestr, "MM-DD HH:mm").format('LLLL');
                //date = typeof dateobj !== 'undefined' ? dateobj.startDate : datestr;

            if (user !== '' && user != author)
                return;
	    
	    //console.log('Original: '+datestr+' After:' +date);
            feed.item({
                title: name,
                description: name,
                url: link,
                author: author,
                date: date
            });

            return {name: name, link: link, author: author, meta: meta, date: date};
        }).get();
    }, function(news) {
        res.set('Content-Type', 'text/xml');
        res.send(feed.xml());
    });
}
