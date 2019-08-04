/**
 * Created by hacketo on 21/07/18.
 */

const expect = require('chai').expect;

const MediaHisto = require('../src/history').MediaHisto;
const History = require('../src/history').History;


describe('MediaHisto', function(){

  describe('Constructor', function(){

    let mediaHisto;
    const date = new Date();
    beforeEach(function(){

      mediaHisto = new MediaHisto('1', '2', date, 0);
    });

    it('Should initialise properties', function(){
      expect(mediaHisto.url).to.be.equals('1');
      expect(mediaHisto.name).to.be.equals('2');
      expect(mediaHisto.dates.length).to.be.equals(1);
      expect(mediaHisto.dates[0]).to.be.equals(date);
      expect(mediaHisto.time).to.be.equals(0);

      expect(`${mediaHisto}`).to.be.equals(`1;2;${date };${ 0}`);
    });

  });

});

describe('History', function(){

  describe('Constructor', function(){

    let history;
    const date = new Date();
    beforeEach(function(){
      history = new History(`${__dirname}/media_history.csv`);
    });

    it('Should add/edit medi histo', function(){
      const media1 = history.add('1', '2', date, 0);

      expect(history.history.length).to.be.equals(1);
      expect(history.history[0].url).to.be.equals('1');
      expect(history.history[0].name).to.be.equals('2');
      expect(history.history[0].dates.length).to.be.equals(1);
      expect(history.history[0].dates[0]).to.be.equals(date);
      expect(history.history[0].time).to.be.equals(0);

      const media2 = history.add('2', '3', date, 0);

      expect(history.history.length).to.be.equals(2);
      expect(history.history[1].url).to.be.equals('2');
      expect(history.history[1].name).to.be.equals('3');
      expect(history.history[1].dates.length).to.be.equals(1);
      expect(history.history[1].dates[0]).to.be.equals(date);
      expect(history.history[1].time).to.be.equals(0);

      const media3 = history.add('1', '2', date, 0);

      expect(media1).to.be.equals(media3);
      expect(history.history.length).to.be.equals(2);
      expect(history.history[0].url).to.be.equals('1');
      expect(history.history[0].name).to.be.equals('2');
      expect(history.history[0].dates.length).to.be.equals(2);
      expect(history.history[0].dates[1]).to.be.equals(date);
      expect(history.history[0].time).to.be.equals(0);

      expect(history.history.join('\n')).to.be.equals(`${media1}\n${media2}`);

      return history.save()
          .catch(err => {
            expect(err).to.be.equals(undefined);
          })
          .then(() => {
            return history.load()
                .catch((err) => {
                  expect(err).to.be.equals(undefined);
                })
                .then((data) => {
                  expect(`${data[0]}`).to.be.equals(`${media1}`);
                  expect(`${data[1]}`).to.be.equals(`${media2}`);
                });
          });
    });

  });

});
