// const { ipcRenderer } = require('electron')
// import { ipcRenderer } from 'electron'
const {useState} = React
console.log(ipcRenderer)
function TextInput() {
  const [chosenCountry, chooseCountry] = useState("")
  const [inputvalue, setValue] = useState("")
  const [results, setResults] = useState(0)
  // setInterval(()=>{
  //   ipcRenderer.send()
  // },10000)
  return (
    <>
      <input onChange={(e) => {
        setValue(e.currentTarget.value)
      }} />
      <button onClick={() => {
        ipcRenderer.send('scrapeurl', inputvalue)
        chooseCountry(inputvalue)
      }}>Scrape</button>
    </>
  )
}



ReactDOM.render(
  <TextInput />,
  document.getElementById('root')
);
