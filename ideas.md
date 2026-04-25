bugs :

When creating a line between FP and Australia the line goes around the world because of coordinate jump
Start a new route with 1 waypoint, select an existing route : you have an orphan waypoint

sometimes when comparing multiple routes, we see only the 2 out of 3 once data are loaded

when showing a route far in the past, forecast table will show -- until now+6, instead of stopping 6h after arrival+6
it will also scroll to now when it should scroll to arrival


improvements :

add back ? forecast table header in multi route with "Comparing X routes" ?

click on route column goes to route forecast : how to handle back ? < Compare ?


change "row" to forecast-cells or so, that contains timestamp and isCurrent, but invisble in the flow
Move Datasource back to a single route data source, add offsets to getRows. Maybe ghostTimestamp should manipulate offset
Create a MultiForecastDataSource that will hold multiple data sources and do the aggregation, calculating offsets, handling drag (as would ghostTimestamp do). 
Check what ghostTimestamp should do, where it should go
Modify ForecastTable to display multiple forecast-cells next to each other within a forecast-row (rename forecast-item to forecast-row)




In the forecast table header, add an "active" state on the current overlay

if the selected route is not visible on map, scroll to there

Update the True/Apparent wind selector to a toggle switch

Make the boat icon slighlty bigger

Update the routes possible colors, avoid too light colors (like light yellow and light blue) because it's not really visbile in the ForecastTable in the current hour background

