/**
 * Created by hacketo on 03/08/19.
 */

const expect = require('chai').expect;

const wget = require('../src/wget').wget;
const parseLineData = require('../src/wget').parseLineData;


describe('wget', function(){

  const file_url = 'https://30.download.real-debrid.com/d/BDWPCAQTZFQJI/Pirates%20Of%20The%20Caribbean%20Dead%20Men%20Tell%20No%20Tales%20%282017%29%20VFF-ENG%20AC3-DTS%20BluRay%201080p%20x264.GHT.mkv';

  /*
  Test ok

--2019-09-23 17:49:57--  https://42.download.real-debrid.com/d/D3GWROZBZLMWW/Peaky.Blinders.S05E05.The.Shock.1080p.AMZN.WEB-DL.DD%2B5.1.H.264.VOSTFR-NoTag.mkv
Resolving 42.download.real-debrid.com (42.download.real-debrid.com)... 5.39.226.219
Connecting to 42.download.real-debrid.com (42.download.real-debrid.com)|5.39.226.219|:443... connected.
HTTP request sent, awaiting response... 200 OK
Length: 3430147472 (3,2G) [application/force-download]
Saving to: ‘./Peaky.Blinders.S05E05.The.Shock.1080p.AMZN.WEB-DL.DD+5.1.H.264.VOSTFR-NoTag.mkv.3’
     0K .......... .......... .......... .......... ..........  0%  644K 86m41s
    50K .......... .......... .......... .......... ..........  0% 3,29M 51m37s
   100K .......... .......... .......... .......... ..........  0% 8,04M 36m41s
   150K .......... .......... .......... .......... ..........  0% 4,78M 30m21s
   200K .......... .......... .......... .......... ..........  0% 6,39M 25m59s
   250K .......... .......... .......... .......... ..........  0% 5,34M 23m22s


--2019-09-23 17:54:16--  https://42.download.real-debrid.com/d/D3GWROZBZLMWW/Peaky.Blinders.S05E05.The.Shock.1080p.AMZN.WEB-DL.DD%2B5.1.H.264.VOSTFR-NoTag.mkv
Résolution de 42.download.real-debrid.com (42.download.real-debrid.com)… 5.39.226.219
Connexion à 42.download.real-debrid.com (42.download.real-debrid.com)|5.39.226.219|:443… connecté.
requête HTTP transmise, en attente de la réponse… 200 OK
Taille : 3430147472 (3,2G) [application/force-download]
Sauvegarde en : « ./Peaky.Blinders.S05E05.The.Shock.1080p.AMZN.WEB-DL.DD+5.1.H.264.VOSTFR-NoTag.mkv.1 »
     0K .......... .......... .......... .......... ..........  0%  571K 97m47s
    50K .......... .......... .......... .......... ..........  0% 2,86M 58m25s
   100K .......... .......... .......... .......... ..........  0% 2,90M 45m13s
   150K .......... .......... .......... .......... ..........  0% 5,33M 36m29s
   200K .......... .......... .......... .......... ..........  0% 5,38M 31m13s
   250K .......... .......... .......... .......... ..........  0% 2,86M 29m11s
   300K .......... .......... .......... .......... ..........  0% 5,35M 26m28s
   350K .......... .......... .......... .......... ..........  12% 6,00M 24m18s

   */

  it('should dl file', function(){

    this.timeout(25000);


    return new Promise(resolve => {

      const filePath = './';
      const event = wget(file_url, filePath);

      event.on('error', function(data){
        console.error(`error: ${data}`);
      });

      event.on('progress', function(progress){
        console.log(`progress: ${JSON.stringify(progress)}`);
        if (progress.progress === 1){
          resolve();
        }
      });

      event.on('close', (code) => {
        console.log(`close: child process exited with code ${code}`);
      });
    });
  });

  it('should dl file', function(){

    const data = parseLineData('   350K .......... .......... .......... .......... ..........  12% 6,00M 24m18s');
    console.log(data);
  });


  /*
  Test NOK

  --2019-09-23 17:56:23--  http://d3vx.fr/index.html
Résolution de d3vx.fr (d3vx.fr)… 37.187.177.5
Connexion à d3vx.fr (d3vx.fr)|37.187.177.5|:80… connecté.
requête HTTP transmise, en attente de la réponse… 301 Moved Permanently
Emplacement : https://d3vx.fr/index.html [suivant]
--2019-09-23 17:56:23--  https://d3vx.fr/index.html
Connexion à d3vx.fr (d3vx.fr)|37.187.177.5|:443… connecté.
requête HTTP transmise, en attente de la réponse… 404 Not Found
2019-09-23 17:56:24 erreur 404 : Not Found.


   */
});
