const getvideoduration = require('get-video-duration');
const fs = require('fs'),
    util = require('./util'),
    youtubedl = require('youtube-dl');
const Subtitle = require('subtitle');

function MediaModel(url){
    this.url = url || "";
    this.quality = "";
}

function Media(url){

    this.setUrl_(url || "");

    this.duration = null;
    this.subtitles = [];

    /**
     *
     * @type {Array<MediaModel>}
     */
    this.medias = [];
}

/**
 * Update the url of the media, and the ext
 * @param {string} url
 * @private
 */
Media.prototype.setUrl_ = function(url){
    if (typeof url !== "string"){
        throw new Error('url should be a string');
    }

    if (url !== this.url) {
        this.url = url;
        this.filename = path.posix.basename(url);
        this.ext = path.extname(url);
    }
};

/**
 * Update the url of the media, and the ext
 * @private
 */
Media.prototype.resolveMedias = function(){
    if (!this.medias.length){
        this.medias = [new MediaModel(this.url)];
    }
    return Promise.resolve(this.medias);
};

/**
 * Try to resolve the duration for the media
 * @returns {Promise<number>|Promise<any | never>}
 */
Media.prototype.resolveDuration = function(){
    if (this.duration != null){
        return Promise.resolve(this.duration);
    }

    if (!this.url.length){
        return Promise.reject('no media url provided');
    }

    return getvideoduration(this.url).then((duration) => {
        this.duration = duration;
        return this.duration;
        // if (this.checkSpawnID_(spawnID)){
        //     return Promise.reject("another spawn instance started");
        // }

        // this.spawnOk_(spawnID, media, duration, displayedUrl, subtitles);
    }, (error) => {
        util.error(this.url, error);
        this.duration = null;
        throw new Error(error);
    });
};


const tempDir = __dirname + "../temp/";

/**
 * Check if a file with the same name but SRT ext exists near by the media file
 * @returns {Promise<Array<string>>}
 */
Media.prototype.resolveSubtitles = function(){
    if (fs.existsSync(tempDir+this.filename+SRT_EXT)){
        this.subtitles = [this.filename+SRT_EXT];
    }
    else{
        this.subtitles = [];
    }
    return Promise.resolve(this.subtitles)
};


Media.prototype.next = function(){
    return null;
};


Media.prototype.previous = function(){
    return null;
};



function WebMedia(url){
    Media.call(this, url);
}

/**
 * Update the url of the media, and the ext
 * @private
 */
WebMedia.prototype.resolveMedias = function(){
    if (!this.medias.length){

        return new Promise((resolve, reject) =>{
            //TODO-tt empty for regular quality
            let args = [];
            youtubedl.getInfo(media, args, (err, info) => {

                if (err) {
                    util.error(err);
                    return reject(err);
                }

                // If another spawn was started, no need to do anything here ...
                // if (this.checkSpawnID_(spawnID)) {
                //     return;
                // }

                //util.debug(info);
                // Duration of the media in ms
                this.duration = info._duration_raw;

                this.medias = this.sortFormats(info.formats, info.format);
                resolve(this.medias);
            });
        });
    }
    return Promise.resolve(this.medias);
};

const FORMAT_PREF = [
    "137 - 1920x1080 (1080p)",
    "22 - 1280x720 (hd720)",
    "299 - 1920x1080 (1080p60)",
];

const EXT_PREF = [
    "mp4"
];

WebMedia.prototype.sortFormats = function(formats, mainFormat){

    let pref = FORMAT_PREF.slice();
    if (!pref.includes(mainFormat)) {
        pref.push(mainFormat);
    }

    let formatList = [];

    formats.forEach(format => {
        let iOf = FORMAT_PREF.indexOf(format.format);
        if (iOf > 0){
            format.__cValue = iOf;
            formatList.push(format);
        }
    });

    formatList.sort((f1, f2) => {
        return f1.__cValue - f2.__cValue;
    });

    return formatList;
};

const preferedLang = "fr".toLowerCase();

/**
 *
 * @returns {Promise<Array<Array<string>>>}
 */
WebMedia.prototype.listAvailableSubtitles = function(){

    return new Promise((resolve, reject) => {

        youtubedl.exec(this.url, ['--list-subs'], {}, (err, output) => {
            if (err) {
                return reject(err);
            }
            // console.log(output.join('\n'));

            let rValue = {
                auto: [],
                subtitles: []
            };

            let state = 0;
            output.forEach(line => {
                if (line){
                    if (line.startsWith('Available automatic captions')){
                        state = 1;
                    }
                    if (line.startsWith('Available subtitles')){
                        state = 2;
                    }
                    if (state === 1){
                        if (line.startsWith(preferedLang)){
                            if (line.indexOf('vtt') > -1){
                                rValue.auto.push(preferedLang);
                            }
                        }
                    }
                    if (state === 2){
                        if (line.startsWith(preferedLang)){
                            if (line.indexOf('vtt') > -1){
                                rValue.subtitles.push(preferedLang);
                            }
                        }
                    }
                }
            });
            resolve(rValue);
        });
    });
};

/**
 * Try to resolve the duration for the media
 * @returns {Promise<number>|Promise<any | never>}
 */
WebMedia.prototype.resolveDuration = function(){
    if (this.duration != null){
        return Promise.resolve(this.duration);
    }

    if (!this.url.length){
        return Promise.reject('no media url provided');
    }

    return new Promise((resolve, reject) =>{
        //TODO-tt empty for regular quality
        let args = [];
        youtubedl.getInfo(media, args, (err, info) => {

            if (err) {
                util.error(err);
            }

            // If another spawn was started, no need to do anything here ...
            if (this.checkSpawnID_(spawnID)) {
                return;
            }

            if (!err) {
                //util.debug(info);

                this.media = info.url;

                // Duration of the media in ms
                this.duration = info._duration_raw;
            }
        });
    });
};


const tempDir = __dirname + "../temp/";

/**
 * Check if a file with the same name but SRT ext exists near by the media file
 * @returns {Promise<Array<string>>}
 */
WebMedia.prototype.resolveSubtitles = function(){
    if (fs.existsSync(tempDir+this.filename+preferedLang+SRT_EXT)){
        this.subtitles = [this.filename+preferedLang+SRT_EXT];
        return Promise.resolve(this.subtitles);
    }

    return this.listAvailableSubtitles().then((data) => {

        return new Promise((resolve, reject)=>{

            let dlSubs = !!data.subtitles.length || !!data.auto.length;

            if (dlSubs) {
                let auto = !data.subtitles.length;

                let options = {
                    // Write automatic subtitle file (youtube only)
                    auto: auto,
                    // Downloads all the available subtitles.
                    all: false,
                    // Subtitle format. YouTube generated subtitles
                    // are available ttml or vtt.
                    format: 'srt',
                    // Languages of subtitles to download, separated by commas.
                    lang: preferedLang,
                    // The directory to save the downloaded files in.
                    cwd: this.tempDir,
                };

                youtubedl.getSubs(this.url, options, (err, files) => {
                    if (err) {
                        util.error(err);
                        util.deleteFiles(files);
                        return reject();
                    }

                    // In case we have at least one subtitle in the 'files' list
                    if (files && typeof files[0] === "string") {

                        util.debug("Downloaded sutitles : ", files);

                        let subtitleFile = this.tempDir + '/' + files[0];

                        // Start handling the downloaded file (format conversion ..)

                        return resolve(this.handleSubtitles(subtitleFile).then((subtitleFile) => {

                            // Delete any other downloaded files that we don't need to use for the media
                            util.deleteFiles(files, [subtitleFile]);
                            return subtitleFile;
                        }).catch(reason => {
                            util.deleteFiles(files);
                        }));
                    }
                    resolve([]);
                });
                return;
            }
            resolve([]);
        });
    });
};

/**
 *
 * @param {string} subtitleFile
 * @param {number} spawnID
 * @returns {Promise<void|string>}
 */
WebMedia.prototype.handleSubtitles = function(subtitleFile){

    return new Promise((resolve, reject) => {

        util.debug("Subtitles "+subtitleFile);

        if (subtitleFile.endsWith(VTT_EXT)) {
            let originalFile = subtitleFile;
            let srtFile = originalFile.slice(0, originalFile.length - VTT_EXT.length) + SRT_EXT;

            // Will use already cached file
            if (fs.existsSync(srtFile)) {
                util.deleteFile(originalFile);
                subtitleFile = srtFile;
                resolve(srtFile);
            }
            else{
                fs.readFile(originalFile, 'utf8', (err, data) => {
                    util.deleteFile(originalFile);

                    if (err) {
                        util.error(err);
                    }

                    if (err) {
                        // Here originalFile will not have a valid format and will be deleted after if not already
                        resolve(originalFile);
                    }
                    else {
                        let srtdata = Subtitle.stringify(Subtitle.parse(data));

                        fs.writeFile(srtFile, srtdata, (err) => {
                            let rValue;
                            if (err) {
                                util.error(err);
                                util.deleteFile(srtFile);
                            }
                            else {
                                util.debug('The file has been saved! : '+srtFile);
                                rValue = srtFile;
                            }

                            resolve(rValue);
                        });
                    }
                });
            }
        }
        else {
            // Here subtitleFile will not have a valid format and will be deleted after if not already
            resolve(subtitleFile);
        }
    })
        .then (subtitleFile => {

            if (this.checkSpawnID_(spawnID)){
                return Promise.reject();
            }

            if (subtitleFile) {
                if (!subtitleFile.endsWith(SRT_EXT)) {
                    util.deleteFile(subtitleFile);
                    subtitleFile = null;
                }
            }

            if (subtitleFile) {
                util.log('SUBTITLES: '+ subtitleFile);
            }

            return subtitleFile;
        });
};

WebMedia.prototype.next = function(){
    return null;
};


WebMedia.prototype.previous = function(){
    return null;
};

