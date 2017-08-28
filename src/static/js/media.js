$(document).ready(function() {
    $("#audio-player").bind($.jPlayer.event.ended, function (event) {
        // done playing
        $('.playlist-tracks tr.active').next('tr').children(':first').click();
    });
});

// v0.6 LOAD ARTIFACT VIEW
var priceScale = 1;

function loadArtifactView2(objMeta) {
	// HIDE OTHER VIEWS
    if ($('#intro').length > 0) {
    	document.getElementById('intro').style.display = 'none';
    }
	$('main').hide();
	hideOverlay();
	resetInterface();
	$('#search').show();
	$('.wallet-ui').hide();
	$('.publisher-ui').hide();
	$('.sharing-ui').hide();
	$('.view-publishers-ui').hide();
	$('#view-media .entity-view').hide();
	// SHOW MEDIA VIEW
    artifactLoaded = false;
	$('#view-artifact').show();
	var mediaID = '';
	// GET MEDIA ID FROM objMeta
	console.log(objMeta);
	if ( (objMeta) && (objMeta.length == 1) ) {
		mediaID = $(objMeta).attr('id').split('-')[1];
	// GET MEDIA ID FROM LOCATION
	} else if (!objMeta) {
		if (location.pathname.slice(1).split('/')[2]) {
			mediaID = location.pathname.slice(1).split('/')[2];
		} else {
			mediaID = location.pathname.slice(1).split('/')[1];
		}
	} else {
		mediaID = objMeta;
	}
	// GET ALL THE MEDIA DATA
	var thisMediaData = searchAPI('media', 'txid', mediaID);

    // Check for multiple txns with matching search string
    if ((thisMediaData.length > 1) && (mediaID.length === 6)) {
        for (var tx = 0; tx < thisMediaData.length; tx++) {
            if (thisMediaData[tx].txid.slice(0,6) != mediaID) {
                thisMediaData.splice(thisMediaData[tx], 1);
            }
        }
    }

    if (thisMediaData[0]['media-data']['alexandria-media']['payment']) {
        if (thisMediaData[0]['media-data']['alexandria-media']['payment']['scale']) {
            priceScale = thisMediaData[0]['media-data']['alexandria-media']['payment']['scale'].split(':')[0];
        } else {
        	priceScale = 1;
        }
    }
    console.log (mediaID, thisMediaData);
    var artifactTimestamp = thisMediaData[0]['media-data']['alexandria-media']['timestamp'];
    if ( ( (artifactTimestamp.toString().length === 10) && (artifactTimestamp <= 1462162572) ) || ( (artifactTimestamp.toString().length === 13) && (artifactTimestamp <= 1462162572000) ) ) {
        var obsoluteArtifactDate = new Date(1462162572000).toString().split(' ');
        var displayObsDate = obsoluteArtifactDate[1] + ' ' + obsoluteArtifactDate[2] + ' ' + obsoluteArtifactDate[3];
        $('#app-footer').prepend('<div id="footer-notice">Notice: Some artifacts published before ' + displayObsDate + ' may not be accessible.</div>');
    }
    window.doMountMediaBrowser('#media-browser', thisMediaData);
}

var delay = 5000;
var keepHash;
var mainFile;
var URL_RECV = "https://api.alexandria.io/payproc/receive";
var URL_GETRECVD = "https://api.alexandria.io/payproc/getreceivedbyaddress/";

var artifactLoaded = false;
var posterFrame = '';

window.doMountMediaBrowser = function (el, data) {
    $('.media-cover img').attr('src','');
    $('.jp-type-single').hide();
    return mountMediaBrowser(el, data);
}

function formatInt(num, length) {
    var r = "" + num;
    while (r.length < length) {
        r = "0" + r;
    }
    return r;
}

function fixDataMess(data) {
    var ret = [];
    var i = 2;
    var j = 'filename';

    while (data.hasOwnProperty(j)) {
        ret.push(data[j]);


        j = 'track' + formatInt (i++, 2);
    }

    return ret;
}

function prettifyTrack (track, xinfo) {
    return track
        .replace (xinfo.artist, '')
        .replace (' - ', '')
        .replace (/\.(mp3|flac)$/, '')
        .replace (/^[0-9]+ +/, '');
}

function renderPlaylistFilesHTML (files, xinfo, el, artifactType, extraFiles) {

    // Remove all current elements
    el.empty();
    extraFiles.parent().show();
    extraFiles.empty();
    var i = 1;

    var trackTime = secondsToPrettyString(parseInt(xinfo.runtime), true);
    if (files.length > 1) {
    	trackTime = '';
    }

    files.forEach (function (file) {

        // Setup cell for price to play, blank td when disallowPlay === true
        var tdPlay = "";
        if (file.disallowPlay && file.disallowPlay === true) {
            tdPlay = "<td class=\"price disabled\"><span>$<span class=\"price\">N/A</span></span></td>";
        } else {
            tdPlay = "<td class=\"price tb-price-play\"><span>$<span class=\"price\">" + (file.sugPlay ? (file.sugPlay/priceScale).toFixed(3) : "Free!") + "</span></span></td>";
        }

        // Setup cell for price to buy, N/A when disallowBuy === true
        var tdBuy = "";
        if (file.disallowBuy && file.disallowBuy === true) {
            tdBuy = "<td class=\"price disabled\"><span>$<span class=\"price\"><span>N/A</span></span></td>";
        } else {
            tdBuy = "<td class=\"price tb-price-download\"><span>$<span class=\"price\"><span>" + (file.sugBuy ? (file.sugBuy/priceScale).toFixed(3) : "Free!") + "</span></span></td>";
        }

        // Only add files to the main playlist where type matches artifact type.
	// Extra files get added to a separate table
        // ToDo: Check for all different file types once implemented
        if ( (file.type) && (file.type != artifactType) ) {
    		extraFiles.append("<tr>" +
    		          "<td>" + (file.dname ? file.dname : file.fname) + "</td>" +
    		          tdBuy +
    		          "</tr>");
    		var trackEl = extraFiles.children().last();
    		trackEl.data({track: file, name: name, url: IPFSUrl([xinfo['DHT Hash'], file.fname]), sugPlay: file.sugPlay/priceScale, minPlay: file.minPlay/priceScale, sugBuy: file.sugBuy/priceScale, minBuy: file.minBuy/priceScale});
    	} else {
            var fileRuntime = file.runtime;
            if (!file.runtime) {
                fileRuntime = file.duration;
            }
    		el.append("<tr><td>" + i++ + "</td>" +
    		          "<td>" + (file.dname ? file.dname : file.fname) + "</td>" +
    		          "<td>" + (xinfo.artist ? xinfo.artist : "") +"</td>" +
    		          "<td>" + (fileRuntime ? secondsToPrettyString(parseInt(fileRuntime), true) : "") + "</td>" +
    		          tdPlay +
    		          tdBuy +
    		          "</tr>");
    		var trackEl = el.children().last();
    		trackEl.data({track: file, name: name, url: IPFSUrl([xinfo['DHT Hash'], file.fname]), sugPlay: file.sugPlay/priceScale, minPlay: file.minPlay/priceScale, sugBuy: file.sugBuy/priceScale, minBuy: file.minBuy/priceScale});
    	}
    });
    if (extraFiles.children().length < 1) {
        extraFiles.parent().hide();
    }

    $('.pwyw-item').off ('click');

    $('.pwyw-item').on ('click', function (e) {
		showPaymentOption(e);
    });

    $('.playlist td').on ('click', function (e) {
    	$('.playlist tr').removeClass('active');
    	$(e.target).closest('tr').addClass('active');
		showPaymentOption(e);
    });
}

function secondsToPrettyString (s, short){
    var duration = moment.duration(s, 's');
    var minutes = duration.minutes()<10 ? "0" + duration.minutes() : duration.minutes();
    var seconds = duration.seconds()<10 ? "0" + duration.seconds() : duration.seconds();
    if (short)
        return duration.hours() + ':' + minutes + ':' + seconds;
    return duration.hours() + ' hours ' + minutes + ' minutes ' + seconds + ' seconds';
}

function getPrices (file) {

    var prices = {
        play: {
            suggested: 0,
            min: 0
        },
        download: {
            suggested: 0,
            min: 0
        }
    };

    if (file.minBuy)
        prices.download.min = file.minBuy;

    if (file.sugBuy)
        prices.download.suggested = file.sugBuy;

    if (file.minPlay)
        prices.play.min = file.minPlay;

    if (file.sugPlay)
        prices.play.suggested = file.sugPlay;

    return prices;
}

function togglePlaybarShadow (bool) {
    var action = bool?'show':'hide';
    $('.jp-type-single')[action]();
    $('#audio-player')[action]();
    $('#embedded-file')[action]();
    $('#native-player')[action]();
    $('.playbar-shadow').toggleClass('hidden', bool);
	$('.buybox').toggleClass('hidden', bool);
}

function applyMediaData(data) {
    var media = data['alexandria-media'];
    var info = media.info;
    var xinfo = info['extra-info'];
    var payment = media.payment;
    var ipfsAddr = xinfo['DHT Hash'];

    var mediaInfoSel = $('.media-info');
    var releaseInfoSel = $('.release-info');
    var mediaDataSel = $('.media-data');
    var tracks = fixDataMess(xinfo);

    // This sets a global mainFile object to the main object.
    if (!xinfo['files']) {
    	xinfo['files'] = [];
		var i = 0;
	    console.info(tracks);
		tracks.forEach( function (file) {
			xinfo['files'][i] = {
				fname: file,
				runtime: xinfo['runtime'],
				minBuy: 0,
				sugBuy: 0,
				minPlay: 0,
				sugPlay: 0,
				type: media.type
			}
			if (xinfo['pwyw']) {
		    	var pwywArray = xinfo['pwyw'].split(',');
				xinfo['files'][i]['sugBuy'] = parseFloat(pwywArray[0])/100;
				xinfo['files'][i]['sugPlay'] = parseFloat(pwywArray[1])/100;
				xinfo['files'][i]['minBuy'] = parseFloat(pwywArray[1])/100;
			} else {
				xinfo['files'][i]['sugBuy'] = 0;
				xinfo['files'][i]['sugPlay'] =  0;
				xinfo['files'][i]['minBuy'] =  0;
			}
			i++
		});
	}
	console.info(xinfo['files']);
	// Fix prices where some are missing
	xinfo['files'].forEach( function (file) {
        if ((file.sugPlay) || (file.minPlay)) {
    		if ((!file.sugPlay) && (file.minPlay > 0)) {
    			file.sugPlay = file.minPlay;
    		}
            if ((!file.minPlay) && (file.sugPlay > 0)) {
                file.minPlay = file.sugPlay;
            }
        } else {
            file.sugPlay = 0;
            file.minPlay = 0;
        }
        if ((file.sugBuy) || (file.minBuy)) {
    		if ((!file.sugBuy) && (file.minBuy > 0)) {
    			file.sugBuy = file.minBuy;
    		}
    		if ((!file.minBuy) && (file.sugBuy > 0)) {
    			file.minBuy = file.sugBuy;
    		}
        } else {
            file.sugBuy = 0;
            file.minBuy = 0;
        }
	});
    mainFile = {
        track: xinfo['files'][0],
        name: xinfo['files'][0].dname,
        url: IPFSUrl([xinfo['DHT Hash'], xinfo['files'][0].fname]),
        sugPlay: xinfo['files'][0].sugPlay,
        minPlay: xinfo['files'][0].minPlay,
        sugBuy: xinfo['files'][0].sugBuy,
        minBuy: xinfo['files'][0].minBuy,
        type: xinfo['files'][0].type
    };
    filetype = mainFile.track.fname.split('.')[mainFile.track.fname.split('.').length - 1].toLowerCase();
    mediaDataSel.data(media)

    // Set what the circles will use for pricing.
    if(!xinfo['files'][0].disallowPlay && xinfo['files'][0].sugPlay) {
    	$('.pwyw-action-play').show();
	    $('.pwyw-price-play').text((xinfo['files'][0].sugPlay/priceScale).toFixed(3));
	    $('.pwyw-price-suggest-play').text((xinfo['files'][0].sugPlay/priceScale).toFixed(3));
    } else {
    	$('.pwyw-action-play').hide();
    }
    if(!xinfo['files'][0].disallowBuy && xinfo['files'][0].sugBuy) {
    	$('#audio-player').hide();
    	$('.pwyw-action-download').show();
	    $('.pwyw-price-download').text((xinfo['files'][0].sugBuy/priceScale).toFixed(3))
	    $('.pwyw-price-suggest-download').text((xinfo['files'][0].sugBuy/priceScale).toFixed(3))
    } else {
    	$('.pwyw-action-download').hide();
    }

    // Set other meta info
    $('.media-artist', mediaInfoSel).text(xinfo.artist ? xinfo.artist : xinfo.creator ? xinfo.creator : "");
    $('.artifact-title', mediaInfoSel).text(info.title);
    $('#titlemeta').text(info.title);
    $('meta[name="description"]').attr('content', info.title);
    $('.ri-runtime', releaseInfoSel).text (secondsToPrettyString(parseInt(xinfo.runtime)));
    $('.ri-audio-count', releaseInfoSel).text (tracks.length);
    $('.ri-publisher', releaseInfoSel).text (media.publisher);
    $('.ri-btc-address', releaseInfoSel).text (xinfo['Bitcoin Address']);
    if (!xinfo['Bitcoin Address']) {
        getTradeBotBitcoinAddress(media.publisher, function(data){
            $('.ri-btc-address').html(data);
        });
    }
    var coverArt = (xinfo.coverArt) ? (xinfo.coverArt) : getObjects(xinfo['files'], 'type', 'coverArt') ;
	if (coverArt.length > 0) {
        coverArt = (typeof coverArt === 'string') ? (IPFSUrl ([ipfsAddr,  coverArt])) : (IPFSUrl ([ipfsAddr,  coverArt[0].fname]));
    	$('.playbar-shadow').css('width','initial');
	    $('.media-cover img').attr('src', coverArt);
		$('.media-info').css('width','50%');
        $('.media-cover').css('width','50%').show();
	} else {
	    $('.media-cover').hide();
		$('.media-info').css('width','100%');
	}

    renderPlaylistFilesHTML(xinfo['files'], xinfo, $('.playlist-tracks'), media['type'], $('.playlist-extra-files'));

	posterFrame = getObjects(xinfo['files'], 'type', 'preview');
        posterFrame = (posterFrame[0]) ? (posterFrame[0]['fname']) : ('');
        if (posterFrame == '') {
        	posterFrame = 'alexandria-default-posterframe.png';
        }

    keepHash = (xinfo['DHT Hash']) ? (xinfo['DHT Hash']) : (media.torrent);

	var pubTime = media.timestamp;
	if (pubTime.toString().length == 10) {
		pubTime = media.timestamp * 1000;
	}

    $('.ri-date').text(moment(pubTime).format('MMMM Do YYYY'));

    $('.media-description').html(info.description.replace(/(?:\r\n|\r|\n)/g, '<br />'));

    watchForPin (ipfsAddr, xinfo.filename)

    return media;
}

function watchForPin (addr, filename) {
    if (window.pinWatcher)
        clearInterval (window.pinWatcher)

    var pinningSel = $('.pwyw-currently-pinning');
    window.pinWatcher = setInterval (function () {
        /* ToDo: Implement Pinning.
        $.ajax ({
            // XXX(xaiki): hardcoded Tiny Human.mp3
            url: window.librarianHost + '/api/ipfs/dht/findprovs/' + 'QmRb23uqmA3uJRUoDkRyG3qXvTpSV5a4zwe6yjJRsLZvAm'
        })
            .done(function (data) {
                var count = data.output.split('error:')[0].split(' ').length;
                pinningSel.text(count)
            })
            .fail(function () {

            })*/
    }, 2000)
}

function IPFSUrl (components) {
    return encodeURI (IPFSHost + '/ipfs/' + components.join ('/'));
}

function showPaymentOption(e) {
        var self = e.target;
        if( $(self).hasClass('disabled') ) {
        	return false;
        }
        var	fileData = $('.playlist tr.active').data();
        $('.media-track').hide();
        var btcAddress = $('.ri-btc-address').text();
        var price;
        var sugPrice;
        var actionElement;
        var action;

        // Try to load in balance for local btc wallet
        try {
        	loadPaywallWalletInfo();
        } catch (e) { console.log(e); }

        // Check if we are the play or download button
        if ($(self).closest('td').hasClass('tb-price-download') || $(self).closest('li').hasClass('pwyw-action-download') || $(self).closest('tbody').hasClass('playlist-extra-files')){
            actionElement = $('.pwyw-activate-download');
            action = 'download';
            price = fileData.minBuy ? fileData.minBuy : 0;
            sugPrice = fileData.sugBuy ? fileData.sugBuy : 0;
        } else {
            actionElement = $('.pwyw-activate-play');
            action = 'play';
            price = fileData.minPlay ? fileData.minPlay : 0;
            sugPrice = fileData.sugPlay ? fileData.sugPlay : 0;
		}

		// Preform checks on payment edge cases
		if ((price === 0 || price === undefined || price === NaN) && sugPrice !== 0){
			console.log(price + " " + sugPrice);
			price = sugPrice;
		}

        if (price === 0 || price === undefined || price === NaN){
            onPaymentDone(action, fileData);
            return;
        }

        if (!fileData.track.dname) {
            $('.media-track').text(fileData.track.fname);
        } else {
            $('.media-track').text(fileData.track.dname);
        }
        $('.media-track').show();
        togglePlaybarShadow(false);
        if (artifactLoaded === false) {
            artifactLoaded = true;
        } else {
            var btcprice = makePaymentToAddress(btcAddress, price, sugPrice, function () {
                return onPaymentDone(action, fileData);
            });
            try {
            	// (BTCUSD*price) converts the USD price to Satoshis.
            	sentFunds = false;
            	watchForLocalWalletPayment(btc_wallet.getFirstAddress(), price, function (a) {
	                console.log(a);
	                return onPaymentDone(action, fileData);
	            });
            } catch (e) {
            	console.log(e);
            }

            $('.pwyw-btc-' + action + '-price').text(btcprice);
            $('.pwyw-usd-' + action + '-price-input').val(sugPrice.toFixed(3));

            $('.pwyw-container').removeClass('active');
            actionElement.addClass('active');

            // Coinbase BTC Code
            if (sugPrice < 1){
            	try {
            		if ((btc_wallet.getTotalBalance() * BTCUSD) > sugPrice){
            			$('#play-warning').hide();
		    			$('#buy-warning').hide();
		    		}
		    		else {
		    			$('#play-warning').show();
		    			$('#buy-warning').show();
		    		}
            	} catch (e) {
            		// Likely an error because btc_wallet is unset, if this happens just default to showing them :)
            		$('#play-warning').show();
	    			$('#buy-warning').show();
            	}
            } else {
            	$('#play-warning').hide();
            	$('#buy-warning').hide();
            }
            testDomain();
            createCoinbaseModal(btcAddress, sugPrice, action);

            // Show paywall
            togglePWYWOverlay(true);
        }
}

function mountMediaBrowser(el, data) {
	try {
		var crshTst = data[0];
	} catch (e) {
		// Data being served is not an array but rather the data supposed to be in the array.
		data = [data];
	}
	var mediaPublisher = data[0]['publisher-name'];
	var mediaID = data[0]['txid'];
	var data = data[0]['media-data'];
    $(el).html($('#media-template').html());
    var mediaData = applyMediaData(data);
    getCryptos();
    var artifactType = mediaData['type'];

    if ( (artifactType === 'video') || (artifactType === 'movie') || (artifactType === 'music') ) {
        // Prep file types that use the built-in media player
        if ( (filetype == 'mp3') || (filetype == 'm4a') || (filetype == 'flac') ) {
    	    $('#audio-player').jPlayer({
    	        cssSelectorAncestor: "#playbar-container",
    	        swfPath: "/js",
    	        supplied: filetype,
    	        size: {
    	        	width: '820px'
    	        },
    	        useStateClassSkin: true,
    	        autoBlur: false,
    	        smoothPlayBar: true,
    	        keyEnabled: true,
    	        remainingDuration: true,
    	        toggleDuration: true,
    	        error: function (e) {
    	            console.error('got jplayer error', e)
    	        }
    	    })
    	} else if ( (filetype == 'mp4') || (filetype == 'm4v') ) {
    	    $('#audio-player').jPlayer({
    	        cssSelectorAncestor: "#playbar-container",
    	        swfPath: "/js",
    	        supplied: "m4v",
    	        size: {
    	        	width: '820px',
    	        	height: '461px'
    	        },
    	        useStateClassSkin: true,
    	        autoBlur: false,
    	        smoothPlayBar: true,
    	        keyEnabled: true,
    	        remainingDuration: true,
    	        toggleDuration: true,
    	        error: function (e) {
    	            console.error('got jplayer error', e)
    	        }
    	    })
    	} else if ( (filetype == 'ogg') || (filetype == 'oga') ) {
    	    $('#audio-player').jPlayer({
    	        cssSelectorAncestor: "#playbar-container",
    	        swfPath: "/js",
    	        supplied: "ogg,oga",
    	        size: {
    	        	width: '820px'
    	        },
    	        useStateClassSkin: true,
    	        autoBlur: false,
    	        smoothPlayBar: true,
    	        keyEnabled: true,
    	        remainingDuration: true,
    	        toggleDuration: true,
    	        error: function (e) {
    	            console.error('got jplayer error', e)
    	        }
    	    })
    	} else if (filetype == 'webm') {
    	    $('#audio-player').jPlayer({
    	        cssSelectorAncestor: "#playbar-container",
    	        swfPath: "/js",
    	        supplied: "webmv",
    	        size: {
    	        	width: '820px',
    	        	height: '461px'
    	        },
    	        useStateClassSkin: true,
    	        autoBlur: false,
    	        smoothPlayBar: true,
    	        keyEnabled: true,
    	        remainingDuration: true,
    	        toggleDuration: true,
    	        error: function (e) {
    	            console.error('got jplayer error', e)
    	        }
    	    })
    	} else if (filetype == 'ogv') {
    	    $('#audio-player').jPlayer({
    	        cssSelectorAncestor: "#playbar-container",
    	        swfPath: "/js",
    	        supplied: "ogv",
    	        size: {
    	        	width: '820px',
    	        	height: '461px'
    	        },
    	        useStateClassSkin: true,
    	        autoBlur: false,
    	        smoothPlayBar: true,
    	        keyEnabled: true,
    	        remainingDuration: true,
    	        toggleDuration: true,
    	        error: function (e) {
    	            console.error('got jplayer error', e)
    	        }
    	    })
       	} else if ( (filetype == 'mov') || (filetype == 'mkv') || (filetype == 'avi') || (filetype == 'wav') || (filetype == 'none') ) {
			$('#audio-player').hide();
			$('#playbar-container').hide();
		} else {
            console.log(filetype);
            // Handle Artifact Types that don't use the built-in media player
    		$('.jp-title').text('Unsupported File Format');

    	}
    }

    $('.pwyw-usd-price-input').on('keyup', function (e) {
        var action = this.classList[1]
            .replace(/^pwyw-usd-/, '')
            .replace(/-price-input$/, '')

        $('.pwyw-btc-' + action + '-price').text (USDToBTC(this.value));
        if (lastAddress) {
            setQR(lastAddress, USDToBTC(this.value));

            // Update Coinbase modal!
            if (this.value < 1){
            	try {
            		if ((btc_wallet.getTotalBalance() * BTCUSD) > this.value){
            			$('#play-warning').hide();
		    			$('#buy-warning').hide();
		    		}
		    		else {
		    			$('#play-warning').show();
		    			$('#buy-warning').show();
		    		}
            	} catch (e) {
            		// Likely an error because btc_wallet is unset, if this happens just default to showing them :)
            		$('#play-warning').show();
	    			$('#buy-warning').show();
            	}
            } else {
            	$('#play-warning').hide();
            	$('#buy-warning').hide();
            }
            createCoinbaseModal(lastAddress, this.value, action);
        }

    })

    $('.pwyw-overlay').on('click',function() {
        togglePWYWOverlay(false);
    });
    $('.pwyw-close').on('click',function() {
        togglePWYWOverlay(false);
    });
    $('.pwyw-pin-it').on('click', function (e) {
        $.ajax({
            url: "http://localhost:8079/api/ipfs/pin/add/" + keepHash
        })
        .done(function (data) {
            if (data.status == "ok") {
                togglePlaybarShadow(true);
                $('.pwyw-close').trigger('click');
            } else if (data.status == "error") {
                if (data.error.indexOf('already pinned recursively') > -1) {
                    togglePlaybarShadow(true);
                    $('.pwyw-close').trigger('click');
                } else {
                    $('.pwyw-pining-error').text('An unknown error has occured, please make sure you have Librarian installed and running.').show();
                }
            } else {
                $('.pwyw-pining-error').text('An unknown error has occured, please make sure you have Librarian installed and running.').show();
            }
        })
        .fail(function() {
            $('.pwyw-pining-error').text('You must have Librarian installed and running in order to use this feature.').show();
        });
    })

    $('.format-selector button').on('click', function (e) {
        filetype = $(e.target).html();
        $('.format-selector button').removeClass('active');
        $(this).addClass('active')
    })

    if (!isEmbed) {
		displayEmbedCode(mediaID, mediaData.type);
	}

	window.scroll(0,0);

	var previewImage = data['alexandria-media']['info']['extra-info']['preview'];
	if ( (previewImage) && (artifactType === 'thing') ) {
        $('#audio-player').hide();
        $('#playbar-container').hide();
		embedFile(artifactType, data['alexandria-media']['info']['extra-info']['DHT Hash'], previewImage);
	} else {
		$('.playlist-tracks tr:first').children(':first').click();
	}

	if (!isEmbed) {
		// MAKE HISTORY ARTIFACT VIEW
		var stateObj = {
			currentView: 'artifact',
			searchResults: false,
			subView: mediaID,
			artifactTitle: mediaData.info.title,
			mediaType: mediaData.type,
			artifactPublisher: mediaPublisher,
			publisherId: mediaData.publisher
		}
		makeHistory(stateObj, stateObj.artifactTitle + ' | ΛLΞXΛNDRIΛ');
	}
}

// EMBED ARTIFACT FROM DHT
function embedFile(mediaType, fileHash, mediaFilename, posterFrame) {
    var embedCode = '';

    var fileExt = mediaFilename.split('.')[mediaFilename.split('.').length-1];
    if (fileExt === 'html')
    	fileExt = fileExt.slice(0,-1);

    if (mediaFilename == 'none') {
         mediaFilename = '';
    }
    if (mediaType == 'book') {
         embedCode = '<object data="' + IPFSHost +'/ipfs/'+ fileHash + '/' + mediaFilename + '" type="application/pdf" width="100%" height="800px" class="book-embed"><p>No PDF plugin installed. You can <a href="' + IPFSHost +'/ipfs/'+ fileHash +'">click here to download the PDF file.</a></p></object>'
    } else if ( (mediaType == 'thing') && (fileExt != 'htm') ) {
         embedCode = '<img src="' + IPFSHost +'/ipfs/'+fileHash+ '/' + mediaFilename +'" class="large-poster" />';
    } else {
        embedCode = '<object data="' + IPFSHost +'/ipfs/'+fileHash+'/'+mediaFilename+'" type="text/html" width="100%" height="620px" />';
    }
    $('#embedded-file').html(embedCode).show();
}

function USDTouBTC (amount) {
    return (1000000*Number(amount)/BTCUSD).toString().substring(0, 16)
}

function USDToBTC (amount) {
    return Math.round((Number(amount)/BTCUSD).toString().substring(0, 16)*100000000)/100000000
}

function BTCtoUSD (amount) {
    return Math.round((Number(amount)*BTCUSD).toString().substring(0, 16)*100)/100
}

function loadTrack (name, url, fname) {
    filetype = filetype.toLowerCase();
	fname = encodeURI(fname).replace('+', '%20');
	var posterurl = url;
	if (posterFrame == 'alexandria-default-posterframe.png') {
		posterurl = IPFSHost+'/ipfs/QmQhoySfbL9j4jbDRSsZaeu3DACVBYW1o9vgs8aZAc5bLP/';
	}
	if (fname == 'none') {
		$('#audio-player').hide();
        if( $('#native-player') ) {
            $('#native-player').remove();
        }
        $('#embedded-file').append('<video id="native-player" controls="controls" poster="' + posterurl + posterFrame +'" height="461px" width="820px"><source src="'+ url.slice(0,-1) + '" /></video>');      return false;
    }
    $('#audio-player').show();
    $('#playbar-container').show(); 

	if (filetype == 'mp3') {
	    $('#audio-player').jPlayer("setMedia", {
	        title: name,
	        mp3: url + fname
		});
	} else if (filetype == 'flac') {
	    $('#audio-player').jPlayer("setMedia", {
	        title: name,
	        flac: url + fname
		});
	} else if (filetype == 'm4a') {
	    $('#audio-player').jPlayer("setMedia", {
	        title: name,
	        m4a: url + fname
		});
	} else if ( (filetype == 'mp4') || (filetype == 'm4v') ) {
	    $('#audio-player').jPlayer("setMedia", {
	        title: name,
	        m4v: url + fname,
	        poster: posterurl + posterFrame
	    });
	} else if ( (filetype == 'ogg') || (filetype == 'oga') ) {
	    $('#audio-player').jPlayer("setMedia", {
	        title: name,
	        oga: url + fname,
	        poster: posterurl + posterFrame
	    });
	} else if (filetype == 'webm') {
	    $('#audio-player').jPlayer("setMedia", {
	        title: name,
	        webmv: url + fname,
	        poster: posterurl + posterFrame
	    });
	} else if (filetype == 'ogv') {
	    $('#audio-player').jPlayer("setMedia", {
	        title: name,
	        ogv: url + fname,
	        poster: posterurl + posterFrame
	    });
	} else if ( (filetype == 'mov')  || (filetype == 'mkv') || (filetype == 'avi') || (filetype == 'wav') ) {
        // If there's a player still hanging around, remove it first. 
 		if( $('#native-player') ) {
			$('#native-player').remove();
		}
        $('#audio-player').hide();
        $('#playbar-container').hide();
		if ( (filetype == 'mov')  || (filetype == 'mkv') || (filetype == 'avi') ) {
	        $('#embedded-file').append('<video id="native-player" controls="controls" poster="' + posterurl + posterFrame +'" height="461px" width="820px"><source src="'+ url + fname +'" /></video>');
		} else if (filetype == 'wav') {
			console.log (filetype);
	        $('#embedded-file').append('<audio id="native-player" controls="controls"><source src="'+ url + fname +'" /></audio>');
		}
        // Start playing if this is not the first file clicked on
        if (artifactLoaded === false) {
            artifactLoaded = true;
        } else {
            document.getElementById('native-player').play();
        }
        $("#native-player").bind('ended', function(){
            // done playing
            $('.playlist-tracks tr.active').next('tr').children(':first').click();
        });
	}
}

function togglePWYWOverlay (bool) {
	$('.paybox-bitcoin').hide();
	$('#pwyw-btc-play-qrcode img').attr('src','');
	$('.pwyw-btc-address').text('');
    var action = bool?'show':'hide';
    $('.pwyw-close')[action]();
    $('.pwyw-overlay')[action]();
    $('.pwyw-paybox.paybox-first')[action]();
    $('.pwyw-close').appendTo('.pwyw-container.active');
	if (bool === false) {
		$('.pwyw-container.active').toggleClass('active');
	}
}

function toggleBitcoinPay (bool) {
    var action = bool?'show':'hide';
    $('.pwyw-paybox.paybox-first').hide();
	$('.paybox-bitcoin')[action]();
}

function onPaymentDone (action, file) {
    var url = file.url;

    if (action == 'pin') $('.pwyw-pining-error').hide();

    if (action != 'pin') {
        togglePWYWOverlay(false);
        togglePlaybarShadow(true);
    }

	console.info(file);

    var trackPath = file.url.slice(0, '-'+ encodeURI(file.track.fname).length);

    var fileType = file.track.type;
    if (!fileType) {
    	fileType = history.state.mediaType;
    }
	var fileName = file.track.fname;
	var trackPath = file.url.slice(0, '-'+ encodeURI(fileName).length);
    if ( (fileType === 'video') || (fileType === 'movie') || (fileType === 'music') ) {
	    var res = loadTrack(file.track.dname, trackPath, fileName);

	    togglePlaybarShadow(true);
        // Use built-in media player for audio and video
		if( !$('#native-player') ) {
            $('#playbar-container').show();
		}
	    if (action === 'download') {
	        // Add a link to download
	        var a = $("<a>").attr("href", url).attr("download", fileName).attr("target","_blank").appendTo("body");
	        // Click the link
	        a[0].click();
	        // Remove the link we added.
	        a.remove();
	        $('#audio-player').jPlayer("load");
	 	} else {
	        if (artifactLoaded === false) {
	            $('#playbar-container').jPlayer("load");
	            artifactLoaded = true;
	        } else {
	            $('#audio-player').jPlayer("play");
	        }
	    } 
    } else {
        // Hide built-in media player
        $('#playbar-container').hide();
        // Embed static artifacts
        embedFile(fileType, trackPath.split('/')[4], fileName, '');
     }
 }

$('#audio-player').click(function(){
	if ( $('#audio-player').jPlayer().data().jPlayer.status.paused == true ) {
		$('#audio-player').jPlayer("play");
	} else {
		$('#audio-player').jPlayer("pause");
	}
});

var lastAddress;

function makePaymentToAddress(address, minAmt, sugAmt, done) {
    togglePlaybarShadow(false);
    var amountInBTC = USDToBTC(minAmt);
    var params = { address: address, amount: amountInBTC };

    $.ajax({
        url: URL_RECV,
        data: params
    })
        .done(function (data, textStatus, jqXHR) {
            console.log("Payment address", data.input_address, "Amount:", sugAmt);
            lastAddress = data.input_address;
            setQR(data.input_address, USDToBTC(sugAmt));
            if (sugAmt < 1){
            	try {
            		if ((btc_wallet.getTotalBalance() * BTCUSD) > sugAmt){
            			$('#play-warning').hide();
		    			$('#buy-warning').hide();
		    		}
		    		else {
		    			$('#play-warning').show();
		    			$('#buy-warning').show();
		    		}
            	} catch (e) {
            		// Likely an error because btc_wallet is unset, if this happens just default to showing them :)
            		$('#play-warning').show();
	    			$('#buy-warning').show();
            	}
            } else {
            	$('#play-warning').hide();
            	$('#buy-warning').hide();
            }

            updateCoinbaseModal(data.input_address, sugAmt);
            watchForpayment(data.input_address, minAmt, done);
        })
        .fail(function (jqXHR, textStatus, errorThrown) {
            console.error(textStatus, errorThrown);
            setTimeout(makePaymentToAddress(address, minAmt, sugAmt, done), 5000);
        });

    return USDToBTC(sugAmt);
}

var paymentTimeout;
var restartWebSocket = true;
var recievedPartial = false;
function watchForpayment(address, amount, done) {
	console.log(address);
    done = done || function () {};
    if (amount <= 0) {
        return done(amount);
    }

    bitcoinWebsocket = new WebSocket("wss://ws.blockchain.info/inv");

    restartWebSocket = true;

    bitcoinWebsocket.onopen = function(evt){
        console.log('Websocket Opened...');
        bitcoinWebsocket.send('{"op":"addr_sub", "addr":"' + address + '"}');
    }

    bitcoinWebsocket.onmessage = function(evt){
        var received_msg = evt.data;
        var message = JSON.parse(received_msg);
        if (message.op == "utx"){
            console.log(message);
            console.log("Recieved transaction, hash: " + message.x.hash);
            
            var bitsRecieved = 0;

            for (var i = 0; i < message.x.out.length; i++) {
                if (message.x.out[i].addr == address){
                    bitsRecieved = message.x.out[i].value;
                    console.log("Bits Recieved: " + bitsRecieved);
                }
            }

            // This converts it from bits to full Bitcoin (i.e. 13312 bits would become 0.00013312 BTC);
            var formattedBTCRecieved = bitsRecieved/100000000;

            // amountPaid is the value in USD recieved.
            var amountPaid = BTCtoUSD(formattedBTCRecieved);
            console.log("Recieved $" + amountPaid);

            var amountRequired = amount;

            if (amountPaid >= amountRequired){
                togglePlaybarShadow(true);
                done(amountPaid);

                restartWebSocket = false;
                clearTimeout(pingTimerId);
                bitcoinWebsocket.close();
            } else {
            	console.log("Recieved partial transaction, not unlocking.");
                recievedPartial = true;
            }
        }
    }

    bitcoinWebsocket.onclose = function(evt){
        // Sometimes the websocket will timeout or close, when it does just respawn the thread.
        console.log("Websocket Closed");

        if (restartWebSocket)
            setTimeout(function(){ watchForpayment(address, amount, done); }, 200);
    }
}

function setQR(address, amount) {
    // Reset the QR Code Div
    var qrCodes = ['pwyw-btc-play-qrcode', 'pwyw-btc-download-qrcode'];

    for (qrCodeId of qrCodes) {
        var parNode = document.getElementById(qrCodeId);
        while (parNode.firstChild) {
            parNode.removeChild(parNode.firstChild);
        }
    }

    if (amount) {
        $('.pwyw-btc-address').text(address);
        var qrOptions = {
             text: "bitcoin:" + address + "?amount=" + amount,
		     width: 300,
		     height: 300,
		     colorDark : "#000000",
		     colorLight : "#FFFFFF",
		     correctLevel : QRCode.CorrectLevel.H };

        for (qrCodeId of qrCodes) {
            var qrPlay = document.getElementById(qrCodeId);
            var qrcodePlay
            if (qrPlay) {
                qrcodePlay = new QRCode(qrPlay, qrOptions);
            }
        }

        $('.pwyw-qrcode img').each(function() {
            $(this).css('margin','auto');
        });
		$('#pwyw-btc-play-qrcode').show();
    }
}

// IFRAME EMBED CODE
function displayEmbedCode (mediaID, mediaType) {

    embedUrl = window.location.origin + window.location.pathname.slice(0, -1 * window.location.pathname.split('/')[window.location.pathname.split('/').length -1].length) + 'embed/' + mediaID;

    var iframeEmbedCode = '<iframe src="'+ embedUrl +'" width="800px" height="600px"></iframe>';
    $('.iframecode').text(iframeEmbedCode);
    $('.row.embedcode').show();
}
