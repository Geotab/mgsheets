# mgsheets
A [Google App-Script library](https://developers.google.com/apps-script/) to use the [MyGeotab API](https://my.geotab.com/sdk) directly from within your Google Sheets as [custom functions](https://developers.google.com/apps-script/guides/sheets/functions).

It allows you to easily add a formula in your Google Sheet, such as

`=MGTRIPS("Company Van")`

This function will return the recent **Trips** for the vehicle named **Company Van**.

## Custom functions
Google sheets will provide you with help if you type the function name inside the cell. 
For example =MGTRIPS(
 
![](images/function-help.png)

### MGMAPURL
Returns a URL to a static map image for the location provided.

Parameter  | Description
-----------|------------
location | The longitude (x) and latitude (y). Select a range of cells horizontally next to each other.
color | The 3 or 6 digit HEX color value. For example, "F0F" or "FF00FF"
width | The width of the map in pixels
height | The height of the map in pixels 
zoom | The zoom level. Default is 17 (street level). 1 is the whole world.
 



