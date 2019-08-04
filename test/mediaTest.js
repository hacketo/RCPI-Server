/**
 * Created by hacketo on 21/07/18.
 */

const expect = require('chai').expect;

const Media = require('../src/media').Media;
const MockInfos = require('./mockyt').MockInfos;
const MockSubs = require('./mockyt').MockSubs;
const MockListAvailable = require('./mockyt').MockListAvailable;
const WebMedia = require('../src/media').WebMedia;

const PropertyReplacer = require('./util').PropertyReplacer;
const youtubedl = require('youtube-dl');
const propertyReplacer = new PropertyReplacer();


Media.deleteVTT = false;
Media.tempDir = __dirname+'/';

afterEach(function(){
  propertyReplacer.restoreAll();
})

describe('Media', function(){

  describe('Constructor', function(){

    let media;

    const url = './mock_media.mp4';

    beforeEach(function(){
      media = new Media(url);
    });



    it('Should initialise properties', function(){
      expect(media, 'no duration').to.have.a.property('duration').that.is.null;
      expect(media.url, 'url does not match').to.be.equals(url);
      expect(media.media_.filename, 'filename does not match').to.be.equals('mock_media.mp4');
      expect(media.media_.ext, 'ext does not match').to.be.equals('.mp4');
    });

    it('Should resolve media', function(){
      return media.resolveMedias().then(() => {
        expect(media.medias_.length, 'should have a media in the list').to.be.equals(1);
        expect(media.medias_[0].url, 'should have a media in the list').to.be.equals(url);
      });
    });

    it.skip('Should resolve duration', function(){
      return media.resolveDuration().then((duration) => {
        expect(media.media_.duration, 'should have a duration').to.be.equals(duration);
      });
    });

  });

});

describe('WebMedia', function(){



  describe('Constructor', function(){

    const FORMAT_PREF = [
      '137 - 1920x1080 (1080p)',
      '22 - 1280x720 (hd720)',
      '299 - 1920x1080 (1080p60)',
    ];

    let media;

    const url = 'https://www.youtube.com/watch?v=Uh15tDU2__c';

    beforeEach(function(){
      media = new WebMedia(url);

      propertyReplacer.replace(youtubedl, 'getInfos', (url, args, options) => {
        options(null, MockInfos);
      });
      propertyReplacer.replace(youtubedl, 'getSubs', (url, args, options) => {
        options(null, MockSubs);
      });
      propertyReplacer.replace(youtubedl, 'exec', (url, args, options, callback) => {
        callback(null, MockListAvailable);
      });


    });

    it('Should initialise properties', function(){
      expect(media, 'no duration').to.have.a.property('duration').that.is.null;
      expect(media.url, 'url does not match').to.equal(url);
      expect(media.media_.filename, 'url does not match').to.equal('watch?v=Uh15tDU2__c');
      expect(media.media_.ext, 'url does not match').to.equal('');
    });

    it('Should resolve media', function(){
      return media.resolveMedias(FORMAT_PREF).then(() => {
        expect(media.medias_.length, 'should have a media in the list').to.equal(1);
        expect(media.medias_[0].format, 'should have a media in the list').to.equal('22 - 1280x720 (hd720)');
      });
    });

    it('Should listAvailableSubtitles', function(){
      return media.listAvailableSubtitles('fr').then((data) => {
        expect(data.auto.length, 'data should have an auto sub available').to.equal(1);
        expect(data.auto[0], 'should be fr').to.equal('fr');
      });
    });

    it('Should resolve subtitles', function(){
      this.timeout(10000);
      return media.resolveSubtitles('fr').then(() => {
        expect(media.subtitles.length, 'should have a media in the list').to.equal(1);
      });
    });
  });

});



