/**
 * Created by hacketo on 03/08/19.
 */

const expect = require('chai').expect;

const wget = require('../src/wget').wget;


describe('wget', function(){

  //const file_url = 'http://d3vx.fr/index.html';

  const file_url = 'https://42.download.real-debrid.com/d/D3GWROZBZLMWW/Peaky.Blinders.S05E05.The.Shock.1080p.AMZN.WEB-DL.DD%2B5.1.H.264.VOSTFR-NoTag.mkv';

  it('should dl file', function(){

    this.timeout(15000);


    return new Promise(resolve => {

      const filePath = './';
      const event = wget(file_url, filePath);

      event.on('error', function(data){
        console.error(`stderr: ${data}`);
      });

      event.on('progress', function(progress){
        console.log(`stdout: ${JSON.stringify(progress)}`);
        if (progress.progress === 1){
          resolve();
        }
      });

      event.on('close', (code) => {
        console.log(`child process exited with code ${code}`);
      });
    });
  });
});
