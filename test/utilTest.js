/**
 * Created by hacketo on 03/08/19.
 */

const expect = require('chai').expect;

const subtitleMaxLineLength = require('../src/util').subtitleMaxLineLength;


describe('subtitleMaxLineLength', function(){

  it('should not touch subtitles', function(){
    const subtitles = "Coucou c'est moi en fait";
    const result = subtitleMaxLineLength(subtitles, 50);
    expect(subtitles).to.equal(result);
  });

  it('should split on 50 char', function(){
    const splitsize = 50;

    let subtitles = "Coucou c'est moi en fait, j'ai pris la confiture labas et puis sa et sa car c'est super bon et blablabla bablabla blabla";

    let result = subtitleMaxLineLength(subtitles, splitsize);
    expect(result.match(/\n/g).length).to.equal(2);
    expect(result).to.equal("Coucou c'est moi en fait, j'ai pris la confiture labas\net puis sa et sa car c'est super bon et blablabla bablabla\nblabla");

    subtitles = "Coucou c'est moi en fait, j'ai pris la confiture labas et puis sa et sa car c'est super bon et blablabla bablabla";
    result = subtitleMaxLineLength(subtitles, splitsize);
    expect(result.match(/\n/g).length).to.equal(1);
    expect(result).to.equal("Coucou c'est moi en fait, j'ai pris la confiture labas\net puis sa et sa car c'est super bon et blablabla bablabla");

    subtitles = "Coucou c'est moi en fait, j'ai pris la confiturefhdjkfdhjk labas et puis sa et sa car c'est super bon et blablabla bablabla";
    result = subtitleMaxLineLength(subtitles, splitsize);

    // First end of char will overlap max char to not split on word
    expect(result.indexOf('\n', 0)).to.equal(58);

    expect(result.match(/\n/g).length).to.equal(2);
    expect(result).to.equal("Coucou c'est moi en fait, j'ai pris la confiturefhdjkfdhjk\nlabas et puis sa et sa car c'est super bon et blablabla\nbablabla");

    console.log(result);
  });

});
