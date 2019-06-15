/**
 * Created by hacketo on 21/07/18.
 */

var expect = require('chai').expect;

var Media = require('../src/media').Media;
var WebMedia = require('../src/media').WebMedia;


describe('Media', function(){

	describe ('Constructor', function(){

		var media;

		let url = "./mock_media.mp4";

		beforeEach(function(){
			media = new Media(url);
		});

		it('Should initialise properties', function(){
			expect(media, "no duration").to.have.a.property('duration').that.is.null;
			expect(media.url, "url does not match").to.be.equals(url);
			expect(media.filename, "url does not match").to.be.equals("mock_media.mp4");
			expect(media.ext, "url does not match").to.be.equals(".mp4");
		});

		it('Should resolve media', function(){
			return media.resolveMedias().then( () => {
				expect(media.medias.length, "should have a media in the list").to.be.equals(1);
				expect(media.medias[0].url, "should have a media in the list").to.be.equals(url);
			});
		});

		it.skip('Should resolve duration', function(){
			return media.resolveDuration().then( (duration) => {
				expect(media.duration, "should have a media in the list").to.be.equals(duration);
			});
		});

	});

});

describe('WebMedia', function(){

	describe ('Constructor', function(){

		const FORMAT_PREF = [
			"137 - 1920x1080 (1080p)",
			"22 - 1280x720 (hd720)",
			"299 - 1920x1080 (1080p60)",
		];

		var media;

		let url = "https://www.youtube.com/watch?v=Uh15tDU2__c";

		beforeEach(function(){
			media = new WebMedia(url);
		});

		it('Should initialise properties', function(){
			expect(media, "no duration").to.have.a.property('duration').that.is.null;
			expect(media.url, "url does not match").to.be.equals(url);
			expect(media.filename, "url does not match").to.be.equals("watch?v=Uh15tDU2__c");
			expect(media.ext, "url does not match").to.be.equals("");
		});

		it('Should resolve media', function(){
			return media.resolveMedias(FORMAT_PREF).then( () => {
				expect(media.medias.length, "should have a media in the list").to.be.equals(1);
				expect(media.medias[0].format, "should have a media in the list").to.be.equals("22 - 1280x720 (hd720)");
			});
		});
		it('Should resolve subtitles', function(){
			return media.resolveSubtitles("fr").then( () => {
				expect(media.subtitles.length, "should have a media in the list").to.be.equals(1);
			});
		});
	});

});