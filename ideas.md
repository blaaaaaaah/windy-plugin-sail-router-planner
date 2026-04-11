bugs :

When creating a line between FP and Australia the line goes around the world because of coordinate jump
When dragging the departure waypoint beany, we should reuse a Waypoint component and not redo a partial version with custom div

improvements :

if the selected route is not visible on map, scroll to there

implement compare table

Update the True/Apparent wind selector to a toggle switch

Add the Favorite icon in the ForecastTable footer

Make the boat icon slighlty bigger

Update the routes possible colors, avoid too light colors (like light yellow and light blue) because it's not really visbile in the ForecastTable in the current hour background

Create ForecastListDataSource component that will expose hourlyData and waypoints and all required data for the children.
The  goal is to have all the data for the table to display without further processing :
Each line should have the time and a list of columns, each having the forecastPoint, the type of cell, apparent/true.
The point is to prepare for route/forecasts comparaisons where the table can show multiple forecasts all synced to the same time


Try to extract autoScroll, drag code from ForecastTable
Create a ScrollForecastTable component that will handle the scroll/drag code. It will replace the <div class="data-table vertical-scroll" tag, and take hourlyData and other required data and loop over. All drag/scroll code should be in there

Remove ForecastContainer that doesn't add much




