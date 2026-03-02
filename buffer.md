The user starts on one of the regulat Windy layers, Wind, Gusts, Current or whatever

When the user activates the plugin, he will be able to start creating a route by clicking the map. 

When 2+ points are defined, the "table" part with the forecasted data will populate, as the regular Measure&Plan feature of windy works, with a new column for each hour 

We should show Wind speed, Gusts speed, waves direction, current direction, rain precipitations as Windy's current measure&Plan feature. 

This table should also contain AWS range and AWA range (it won't be possible to compute something accurate so we should give a range to the user). We should also include warnings if cape index is > XXX or if gusts is > XXX or if wave height is > XXX and wave direction is not following the course. Each of these will be clearly defined later)

The default boat speed will be 5 knots. Each leg can have a specific average speed set.
The default start time is the current time of the user in his current timezone, rounded to the next hour.

This data table (we will call it the Forecast table) shows the forecast at the predicted position of the boat, position computed using the route, the speed for the route leg and the start time.

The total duration should be displayed, as well as a visual "bar" through the forecast table to show the duration of the passage visually along the forecast table.

The forecast table should show the 6h before the departing time and 6h after the predicted end to allow the user to have an idea of the weather shortly before and after the passage.

The user can change the start time (let's call it departing time). I think I like the way Windy's measure&plan does it, where you can drag a slider above the forecast table, but we will discuss the UI later.
You can set the departure time in the past or in the future.
If we can't get the data because it's in the past, or too long in the future, the forecast table should display "--" for the data it can't get, or any UI feedback to tell the user the data are not available (and why)

The user should be able to scrub through the forecast table (hover or something alike ?) and it should clearly state what date/hour is being currently shown (this is one of the pitfal Windy implementation, you can't clearly see the time of the forecast).
The boat position should also be reflected on the map/route
Also, Windy's layer (wind, gust, current, ...) should reflect the forecast at that time that is currently being overed or scrubbed through, so when the user is scrubbing through time, he will see the boat's position and the forecasted weather of the currently selected layer.
In the forecast table, when the user clicks on the "wind" row, Windy's layer will be changed to "Wind", same for gusts, current, waves and rain/thunder

We need to identify the Windy plugins APIs needed to get a forecast for a model for a position and a specific time.
We also need to identify the Windy plugins. APIs needed to show a specific layer at a specific time.

The UI should be able to accomodate multiple forecast tables at the same time, to handle multiple routes or the same route with different departing times.
When multiple forecast tables, there must be synced on the time, so when the user scrubs through time, he can see the different possibilities. 
The Windy layer (wind/gusts, etc) can accomodate multiple routes because since they are all synced with time when scrubbed, the layer will show the weather at the time scrubbed.

For the GPS position fetched from Predictwind's datahub, TCP, signalk, etc, we should identify the Windy plugin API that sets the current position (to show the white dot). A cool feature would be to show the actual traces of the boat with historical GPS positions but would need some server side work which is out of scope for now.

We should always use Windy's plugin API and not call Windy's Servers API or any other Server API. We should stick as much as possible with Windy's client side API.

A nice feature would be to allow user to save a route to favorites, to avoid recreating it when the browser window is closed or something like that. 

For the UI, I'm not sure it's better to have a bottom forecast table that scrolls horizontally, or a forecast table in the right pane that scroll vertically.

One of the Windy's measure&plan feature pitfal is that the horizontal scroll doesn't work well and it's difficult to see the end of the trip sometimes. Windy's time departure slider is also difficult to move.

There should be a small settings pane where user can define :
- default leg speed
- Configuration for getting GPS position from external source (TBD)



Ideas :
One cool V2 feature would be to add, like predictwind's passage planning :
- % of time upwind, % time reaching, etc.
- % of time downwind waves, etc
- Max gust speed, avg wind speed, lowest wind speed
- Motoring time (we cuold have a "motoring" checkbox for each leg)