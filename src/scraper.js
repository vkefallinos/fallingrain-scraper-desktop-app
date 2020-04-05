const fs = require("fs")
const tokml = require("tokml")
const cheerio = require('cheerio')
const url = require('url')
const request = require("request")
const {  ipcMain } = require('electron');



function asyncRequest(url){
  return new Promise((resolve, reject)=>{
    request(url, function (error, response, html) {
      if (!error && response.statusCode === 200) {
        resolve(html)
      }else if(error){
        reject(error)
      }
    });
  })
}
const FALLINGRAIN_BASE_URL = 'http://fallingrain.com';
function commonStaticScraper($, selectors, scrapeUrl) {
  const listItems = $(selectors.searchListItem);
  let results = [];
  listItems.each(function(i, elem) {
    const result = {};
    for(const propertyKey in selectors.properties) {
      const property = selectors.properties[propertyKey];
      const element = $(this).find(property.selector);
      // console.log(element)
      let value = "";
      switch(property.attribute) {
        case "textContent":
          value = element.text();
          break;
        case "href":
          value = url.resolve(scrapeUrl, element.attr("href"));
          break;
        default:
          value = element.attr(property.attribute);
      }
      result[propertyKey] = value.trim();
    }
    results.push(result);
  });
  return results;
}


const getFallinRainCountryUrl = (country) => `http://fallingrain.com/world/${country}`

const getFallingRainData = async (from, to, country) => {
  /** create a browser instance, then a page instance with it */
  const scrapeUrl  = getFallinRainCountryUrl(country)
  
  const html = await asyncRequest(scrapeUrl)
  // console.log(html)
  const $ = cheerio.load(html)
  
  const regions = await Promise.all(commonStaticScraper($, {
    searchListItem: "body > ul > li",
    properties: {
      region: {
        selector: "a",
        attribute: "textContent"
      },
      regionUrl: {
        selector: "a",
        attribute: "href"
      }
    }
  },  scrapeUrl).slice(from,to).map(async (item,regionIndex)=>{
    const alphabeticalPlacesHtml=  await asyncRequest(item.regionUrl)
    console.log(item.regionUrl)
    // require("fs").appendFileSync("./afgha.json", "// region "+regionIndex)
    const $a = cheerio.load(alphabeticalPlacesHtml)
    const villagesPageUrls = []
    $a("body a").each((i,elem)=>{
      if(elem.attribs.href.startsWith("/world")){
        villagesPageUrls.push(elem.attribs.href)
      }
    })

    const villages = await Promise.all(villagesPageUrls.map(async vurl=>{
      const villagesHtml=  await asyncRequest(`http://fallingrain.com${vurl}`)
      console.log(vurl)
      await new Promise(resolve=>setTimeout(resolve, 100))
      const $vl = cheerio.load(villagesHtml)
      const villagesUrls = []
      $vl("td a").each((i,elem)=>{
        if(elem.attribs.href.startsWith("/world")){
          villagesUrls.push(elem.attribs.href)
        }
      })
      // console.log(villagesUrls)
      return await Promise.all(villagesUrls.map(async (villageUrl)=>{
        const villageHtml=  await asyncRequest(`http://fallingrain.com${villageUrl}`)
        console.log(villageUrl)
        const $v = cheerio.load(villageHtml)
        const villageData = []
        $v("tr:nth-child(1) td").each((i,elem)=>{
          villageData.push($v(elem).text())
        })
        await new Promise(resolve=>setTimeout(resolve, 100))
        const regionName = $v("body > a~ a+ a").text()
        const latinName =  $v("h1+ h3").text().split(":")[1]
        const nonLatinName =  $v("h3+ h3").text().split(":")[1]
        return {
          "type": "Feature",
          "geometry": {
            "type": "Point",
            "coordinates": [villageData[1], villageData[0]]
          },
          "properties": {
            url: "http://fallingrain.com"+villageUrl,
            elevation: villageData[2]+" feet",
            region: regionName||"",
            latinName:latinName||"",
            nonLatinName: nonLatinName||""
          }
        }
      }))

    }))
    
    return villages
  }));
  return regions
};


module.exports =  async(country)=>{
  const max = 100000
  let i = 1
  function flat(data) {
    var r = []
    data.forEach(e => Array.isArray(e) ? r = r.concat(flat(e)) : r.push(e));
    return r;
  }
  try{
    fs.mkdirSync('./geodata')
  }catch(err){

  }
  try{
    fs.mkdirSync(`./geodata/${country}/`)

  }catch(err){

  }
  let kml = {type: "FeatureCollection",features: []}
  ipcMain.on('scrappeddata', (event, url) => {
    event.sender.send(kml.features.length)
  })
  while(i<max){
    const data = await getFallingRainData(i, i+1, country)
    
    kml.features = kml.features.concat(flat(data))
    fs.writeFileSync(`./geodata/${country}/${i}.kml`, tokml(kml))
    i++;
    console.log(i)
  }
}