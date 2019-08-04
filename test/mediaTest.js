/**
 * Created by hacketo on 21/07/18.
 */

const expect = require('chai').expect;

const Media = require('../src/media').Media;
const MediaModel = require('../src/media').MediaModel;
const MockInfos = require('./mockyt').MockInfos;
const MockSubs = require('./mockyt').MockSubs;
const MockListAvailable = require('./mockyt').MockListAvailable;
const WebMedia = require('../src/media').WebMedia;

const PropertyReplacer = require('./util').PropertyReplacer;
const youtubedl = require('youtube-dl');
const propertyReplacer = new PropertyReplacer();

// Override flag to not delete mock vtt file
Media.deleteVTT = false;

// Override default temp dir
Media.tempDir = __dirname + '/';

afterEach(function(){
  propertyReplacer.restoreAll();
});

describe('MediaModel', function() {
  let mediaModel;

  describe('Constructor', function() {
    it('should be like this', function(){

      const url = '/fdsffdsq/fdsq/Fdsq/Dikkenek 2006 DVDRIP x264.mkv';
      const filename = 'Dikkenek 2006 DVDRIP x264.mkv';

      mediaModel = new MediaModel(url);

      expect(mediaModel.url).to.equal(url);
      expect(mediaModel.filename).to.equal(filename);
      expect(mediaModel.ext).to.equal('.mkv');

    });

    it('should be like this', function(){

      const url = 'http://fhfjkdhjkfd.com/Dikkenek 2006 DVDRIP x264.mkv';
      const filename = 'Dikkenek 2006 DVDRIP x264.mkv';
      const ext = '.mkv';
      mediaModel = new MediaModel(url);

      expect(mediaModel.url).to.equal(url);
      expect(mediaModel.filename).to.equal(filename);
      expect(mediaModel.ext).to.equal(ext);

    });
    it('should be like this', function(){

      const url = 'https://r3---sn-25glenez.googlevideo.com/videoplayback?expire=1564956020&ei=FAFHXfTVHY7cxwKXgY7ABw&ip=2a01%3Acb05%3A89b4%3A4c00%3A98f0%3Acf8a%3A14da%3A848e&id=o-APYwYWH3aajQtFS-7LCUtDaUT4u_qpEV0nPov5hUGp8A&itag=249&source=youtube&requiressl=yes&mm=31%2C26&mn=sn-25glenez%2Csn-4g5ednz7&ms=au%2Conr&mv=m&mvi=2&pl=30&initcwndbps=673750&mime=audio%2Fwebm&gir=yes&clen=979328&dur=156.061&lmt=1513326791073296&mt=1564934342&fvip=3&keepalive=yes&c=WEB&sparams=expire%2Cei%2Cip%2Cid%2Citag%2Csource%2Crequiressl%2Cmime%2Cgir%2Cclen%2Cdur%2Clmt&sig=ALgxI2wwRQIhAMT3mwWpjIW4m26It-7DBdy3P__1MZHoPepm6XoQPST_AiAlkMffVmFA0Nq3mJbZHOG51cXWwZh-pF4MwfjjwqMsNg%3D%3D&lsparams=mm%2Cmn%2Cms%2Cmv%2Cmvi%2Cpl%2Cinitcwndbps&lsig=AHylml4wRAIgELMjpQFB4CVtTrbC6GoEPQkgVthD-QXgaeoCVSMKJogCIBdndlGrY2YDEgE9UEmc5y17AUSheuzs3R08iappATVB&ratebypass=yes';
      const filename = 'videoplayback?expire=1564956020&ei=FAFHXfTVHY7cxwKXgY7ABw&ip=2a01%3Acb05%3A89b4%3A4c00%3A98f0%3Acf8a%3A14da%3A848e&id=o-APYwYWH3aajQtFS-7LCUtDaUT4u_qpEV0nPov5hUGp8A&itag=249&source=youtube&requiressl=yes&mm=31%2C26&mn=sn-25glenez%2Csn-4g5ednz7&ms=au%2Conr&mv=m&mvi=2&pl=30&initcwndbps=673750&mime=audio%2Fwebm&gir=yes&clen=979328&dur=156.061&lmt=1513326791073296&mt=1564934342&fvip=3&keepalive=yes&c=WEB&sparams=expire%2Cei%2Cip%2Cid%2Citag%2Csource%2Crequiressl%2Cmime%2Cgir%2Cclen%2Cdur%2Clmt&sig=ALgxI2wwRQIhAMT3mwWpjIW4m26It-7DBdy3P__1MZHoPepm6XoQPST_AiAlkMffVmFA0Nq3mJbZHOG51cXWwZh-pF4MwfjjwqMsNg%3D%3D&lsparams=mm%2Cmn%2Cms%2Cmv%2Cmvi%2Cpl%2Cinitcwndbps&lsig=AHylml4wRAIgELMjpQFB4CVtTrbC6GoEPQkgVthD-QXgaeoCVSMKJogCIBdndlGrY2YDEgE9UEmc5y17AUSheuzs3R08iappATVB&ratebypass=yes';
      const ext = '.webm';

      mediaModel = MediaModel.fromYTFormat([MockInfos.formats[0]])[0];

      expect(mediaModel.url).to.equal(url);
      expect(mediaModel.filename).to.equal(filename);
      expect(mediaModel.ext).to.equal(ext);

    });
    it('should be like this', function(){

      const url = 'https://37.download.real-debrid.com/d/6K5XOSQRSP2OW/Qu.est.ce.qu.on.a.Encore.fait.au.Bon.Dieu.2019.FRENCH.1080p.HDLight.x264.AC3-EXTREME.mkv';
      const filename = 'Qu.est.ce.qu.on.a.Encore.fait.au.Bon.Dieu.2019.FRENCH.1080p.HDLight.x264.AC3-EXTREME.mkv';
      const ext = '.mkv';

      mediaModel = new MediaModel(url);

      expect(mediaModel.url).to.equal(url);
      expect(mediaModel.filename).to.equal(filename);
      expect(mediaModel.ext).to.equal(ext);

    });

  });
});

describe('Media', function(){
  let media;

  const url = './mock_media.mp4';

  beforeEach(function(){
    media = new Media(url);
  });

  describe('Constructor', function() {


    it('Should initialise properties', function () {
      expect(media, 'no duration').to.have.a.property('duration').that.is.null;
      expect(media.url, 'url does not match').to.be.equals(url);
      expect(media.media_.filename, 'filename does not match').to.be.equals('mock_media.mp4');
      expect(media.media_.ext, 'ext does not match').to.be.equals('.mp4');
    });
  });
  describe('Media#resolveMedias', function() {

    it('Should resolve media and have a list', function(){
      return media.resolveMedias().then(() => {
        expect(media.medias_.length, 'should have a media in the list').to.be.equals(1);
        expect(media.medias_[0].url, 'should have a media in the list').to.be.equals(url);
      });
    });

    it('Should resolve duration', function(){

      const duration = 1000;
      // Mock to retrieve video duration without ffprobe
      propertyReplacer.replace(Media.prototype, 'getvideoduration__', (url) => {
        return Promise.resolve(duration);
      });

      return media.resolveDuration().then((dur) => {
        expect(dur).to.equal(duration);
        expect(media.duration, 'should have a duration').to.equal(duration);
      });
    });
  });
});

describe('WebMedia', function(){

  const FORMAT_PREF = [
    '137 - 1920x1080 (1080p)',
    '22 - 1280x720 (hd720)',
    '299 - 1920x1080 (1080p60)',
  ];

  let media;

  const url = 'https://youtu.be/H-O-TocmrI4';

  beforeEach(function(){
    media = new WebMedia(url);

    // propertyReplacer.replace(WebMedia.prototype, 'getInfo__', (url, args, options) => {
    //   options(null, MockInfos);
    // });
    // propertyReplacer.replace(WebMedia.prototype, 'getSubs__', (url, args, options) => {
    //   options(null, MockSubs);
    // });
    // propertyReplacer.replace(WebMedia.prototype, 'exec__', (url, args, options, callback) => {
    //   callback(null, MockListAvailable);
    // });


  });

  describe('Constructor', function() {

    it('Should initialise properties', function() {
      expect(media, 'no duration').to.have.a.property('duration').that.is.null;
      expect(media.url, 'url does not match').to.equal(url);
      expect(media.media_.filename, 'url does not match').to.equal('H-O-TocmrI4');
      expect(media.media_.ext, 'url does not match').to.equal('');
    });
  });

  describe('WebMedia#resolveMedias', function() {
    it('Should resolve media', function(){
      return media.resolveMedias(FORMAT_PREF).then(() => {
        expect(media.medias_.length, 'should have a media in the list').to.equal(1);
        expect(media.medias_[0].format, 'should have a media in the list').to.equal('22 - 1280x720 (hd720)');

        expect(media.filename).to.equal('_-H-O-TocmrI4');
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

    it('Should resolve subtitles mocked', function(){
      this.timeout(10000);

      // Mock to retrieve video duration without ffprobe
      // propertyReplacer.replace(WebMedia.prototype, '.convertSubtitleFileIfNeeded__', (url) => {
      //   return Promise.resolve(MockSubs[0].replace('.vtt', '.srt'));
      // });

      return media.resolveSubtitles('fr').then(() => {
        expect(media.subtitles.length, 'should have a media in the list').to.equal(1);
      });
    });


  });

});



