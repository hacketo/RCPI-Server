/**
 * Created by hacketo on 03/08/19.
 */

var expect = require('chai').expect;

var subtitleMaxLineLength = require('../src/util').subtitleMaxLineLength;


describe('subtitleMaxLineLength', function(){

  it ('should not touch subtitles', function(){
    let subtitles = "Coucou c'est moi en fait";
    let result= subtitleMaxLineLength(subtitles, 50);
    expect(subtitles).to.equal(result);
  });

  it ('should split on 50 char', function(){
    let splitsize = 50;

    let subtitles = "Coucou c'est moi en fait, j'ai pris la confiture labas et puis sa et sa car c'est super bon et blablabla bablabla blabla";

    let result= subtitleMaxLineLength(subtitles, splitsize);
    expect(result.match(/\n/g).length).to.equal(2);
    expect(result).to.equal("Coucou c'est moi en fait, j'ai pris la confiture labas\net puis sa et sa car c'est super bon et blablabla bablabla\nblabla");

    subtitles = "Coucou c'est moi en fait, j'ai pris la confiture labas et puis sa et sa car c'est super bon et blablabla bablabla";
    result= subtitleMaxLineLength(subtitles, splitsize);
  console.log(result);
    expect(result.match(/\n/g).length).to.equal(1);
    expect(result).to.equal("Coucou c'est moi en fait, j'ai pris la confiture labas\net puis sa et sa car c'est super bon et blablabla bablabla");

    subtitles = "Coucou c'est moi en fait, j'ai pris la confiture labas et puis sa et sa car c'est super bon et blablabla bablabla";

    result = subtitleMaxLineLength(subtitles, splitsize);
  });

});