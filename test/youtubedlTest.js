const youtubedl = require('youtube-dl');
const chai = require('chai');


describe('youtubedl', function(){

  it('should do that', function(){
    this.timeout(25000);

    return new Promise( resolve => {
    youtubedl.getInfo('https://www.youtube.com/playlist?list=PLlFikkv2B2ffwYiFQJmcao3RKtw1DFMz5', ['-i', '--flat-playlist'], (err, info) => {
      console.log(err, info);
      resolve();
    });
    });
  })

});
