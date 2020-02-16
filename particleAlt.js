/*
Let's get started:
--------

This is a self-invoking function. Basically, that means that it runs itself 
automatically. The reason for wrapping the script in this is to isolate the 
majority of the variables that I define inside from the global scope and 
only reveal specific functions and values. It looks like this:

(function(argument) {

    alert(argument);

})("Yo.");

and it does the same thing as this:

function thing(argument) {

    alert(argument);

}

thing("Yo.");

*/
(function (w) {

    var canvasParticle, ctxParticle;

    /* 
    This is an associative array to hold the status of the mouse cursor
    Whenever the mouse is moved or pressed, there are event handlers that
    update the values in this array.
    */
    var mouse = {
        x: 0,
        y: 0,
        px: 0,
        py: 0,
        down: false
    };

    /*
    These are the variable definitions for the values that will be used 
    throughout the rest of the script.
    */
    var canvasParticle_width = 900; //Needs to be a multiple of the resolution value below.
    var canvasParticle_height = 600; //This too.

    var resolution = 10; //Width and height of each cell in the grid.

    var pen_size = 40; //Radius around the mouse cursor coordinates to reach when stirring

    var num_cols = canvasParticle_width / resolution; //This value is the number of columns in the grid.
    var num_rows = canvasParticle_height / resolution; //This is number of rows.
    var speck_count = 5000; //This determines how many particles will be made.

    var vec_cells = []; //The array that will contain the grid cells
    var particles = []; //The array that will contain the particles


    /*
    This is the main function. It is triggered to start the process of constructing the
    the grid and creating the particles, attaching event handlers, and starting the
    animation loop.
    */
    function init() {

        //These lines get the canvas DOM element and canvas context, respectively.
        canvasParticle = document.getElementById("swarm");
        ctxParticle = canvasParticle.getContext("2d");

        //These two set the width and height of the canvas to the defined values.
        canvasParticle.width = canvasParticle_width;
        canvasParticle.height = canvasParticle_height;

        /*
        This loop begins at zero and counts up to the defined number of particles,
        less one, because array elements are numbered beginning at zero.
        */
        for (i = 0; i < speck_count; i++) {
            /*
            This calls the function particle() with random X and Y values. It then
            takes the returned object and pushes it into the particles array at the
            end.
            */
            particles.push(new particle(Math.random() * canvasParticle_width, Math.random() * canvasParticle_height));
        }

        //This loops through the count of columns.
        for (col = 0; col < num_cols; col++) {

            //This defines the array element as another array.
            vec_cells[col] = [];

            //This loops through the count of rows.
            for (row = 0; row < num_rows; row++) {
                var cell_data = new cell(col * resolution, row * resolution, resolution)
                vec_cells[col][row] = cell_data;
                vec_cells[col][row].col = col;
                vec_cells[col][row].row = row;

            }
        }

        for (col = 0; col < num_cols; col++) {

            for (row = 0; row < num_rows; row++) {


                var cell_data = vec_cells[col][row];
                var row_up = (row - 1 >= 0) ? row - 1 : num_rows - 1;
                var col_left = (col - 1 >= 0) ? col - 1 : num_cols - 1;
                var col_right = (col + 1 < num_cols) ? col + 1 : 0;


                var up = vec_cells[col][row_up];
                var left = vec_cells[col_left][row];
                var up_left = vec_cells[col_left][row_up];
                var up_right = vec_cells[col_right][row_up];

                cell_data.up = up;
                cell_data.left = left;
                cell_data.up_left = up_left;
                cell_data.up_right = up_right;

                up.down = vec_cells[col][row];
                left.right = vec_cells[col][row];
                up_left.down_right = vec_cells[col][row];
                up_right.down_left = vec_cells[col][row];

            }
        }


        /*
        These lines create triggers that fire when certain events happen. For
        instance, when you move your mouse, the mouse_move_handler() function 
        will run and will be passed the event object reference into it's "e" 
        variable. Something to note, the mousemove event doesn't necessarily 
        fire for *every* mouse coordinate position; the mouse movement is 
        sampled at a certain rate, meaning that it's checked periodically, and 
        if the mouse has moved, the event is fired and the current coordinates 
        are sent. That's why you'll see large jumps from one pair of coordinates
        to the next if you move your mouse very fast across the screen. That's
        also how I measure the mouse's velocity.
        */
        w.addEventListener("mousedown", mouse_down_handler);
        w.addEventListener("mouseup", mouse_up_handler);

        canvasParticle.addEventListener("mousemove", mouse_move_handler);
        //When the page is finished loading, run the draw() function.
        w.onload = draw;

    }


    /*
    This function updates the position of the particles according to the velocity
    of the cells underneath, and also draws them to the canvas.
    */
    function update_particle() {

        //Loops through all of the particles in the array
        for (i = 0; i < particles.length; i++) {

            //Sets this variable to the current particle so we can refer to the particle easier.
            var p = particles[i];

            //If the particle's X and Y coordinates are within the bounds of the canvas...
            if (p.x >= 0 && p.x < canvasParticle_width && p.y >= 0 && p.y < canvasParticle_height) {

                /*
                These lines divide the X and Y values by the size of each cell. This number is
                then parsed to a whole number to determine which grid cell the particle is above.
                */
                var col = parseInt(p.x / resolution);
                var row = parseInt(p.y / resolution);

                //Same as above, store reference to cell
                var cell_data = vec_cells[col][row];

                /*
                These values are percentages. They represent the percentage of the distance across
                the cell (for each axis) that the particle is positioned. To give an example, if 
                the particle is directly in the center of the cell, these values would both be "0.5"
  
                The modulus operator (%) is used to get the remainder from dividing the particle's 
                coordinates by the resolution value. This number can only be smaller than the 
                resolution, so we divide it by the resolution to get the percentage.
                */
                var ax = (p.x % resolution) / resolution;
                var ay = (p.y % resolution) / resolution;

                /*
                These lines subtract the decimal from 1 to reverse it (e.g. 100% - 75% = 25%), multiply 
                that value by the cell's velocity, and then by 0.05 to greatly reduce the overall change in velocity 
                per frame (this slows down the movement). Then they add that value to the particle's velocity
                in each axis. This is done so that the change in velocity is incrementally made as the
                particle reaches the end of it's path across the cell.
                */
                p.xv += (1 - ax) * cell_data.xv * 0.05;
                p.yv += (1 - ay) * cell_data.yv * 0.05;

                /*
                These next four lines are are pretty much the same, except the neighboring cell's 
                velocities are being used to affect the particle's movement. If you were to comment
                them out, the particles would begin grouping at the boundary between cells because
                the neighboring cells wouldn't be able to pull the particle into their boundaries.
                */
                p.xv += ax * cell_data.right.xv * 0.05;
                p.yv += ax * cell_data.right.yv * 0.05;

                p.xv += ay * cell_data.down.xv * 0.05;
                p.yv += ay * cell_data.down.yv * 0.05;

                //This adds the calculated velocity to the position coordinates of the particle.
                p.x += p.xv;
                p.y += p.yv;

                //For each axis, this gets the distance between the old position of the particle and it's new position.
                var dx = p.px - p.x;
                var dy = p.py - p.y;

                //Using the Pythagorean theorum (A^2 + B^2 = C^2), this determines the distance the particle travelled.
                var dist = Math.sqrt(dx * dx + dy * dy);

                //This line generates a random value between 0 and 0.5
                var limit = Math.random() * 0.5;

                //If the distance the particle has travelled this frame is greater than the random value...
                if (dist > limit) {
                    ctxParticle.lineWidth = 1;
                    ctxParticle.beginPath(); //Begin a new path on the canvas
                    ctxParticle.moveTo(p.x, p.y); //Move the drawing cursor to the starting point
                    ctxParticle.lineTo(p.px, p.py); //Describe a line from the particle's old coordinates to the new ones
                    ctxParticle.stroke(); //Draw the path to the canvas
                } else {
                    //If the particle hasn't moved further than the random limit...

                    ctxParticle.beginPath();
                    ctxParticle.moveTo(p.x, p.y);

                    /*
                    Describe a line from the particle's current coordinates to those same coordinates 
                    plus the random value. This is what creates the shimmering effect while the particles
                    aren't moving.
                    */
                    ctxParticle.lineTo(p.x + limit, p.y + limit);

                    ctxParticle.stroke();
                }

                //This updates the previous X and Y coordinates of the particle to the new ones for the next loop.
                p.px = p.x;
                p.py = p.y;
            }
            else {
                //If the particle's X and Y coordinates are outside the bounds of the canvas...

                //Place the particle at a random location on the canvas
                p.x = p.px = Math.random() * canvasParticle_width;
                p.y = p.py = Math.random() * canvasParticle_height;

                //Set the particles velocity to zero.
                p.xv = 0;
                p.yv = 0;
            }

            //These lines divide the particle's velocity in half everytime it loops, slowing them over time.
            p.xv *= 0.5;
            p.yv *= 0.5;
        }
    }


    /*
    This is the main animation loop. It is run once from the init() function when the page is fully loaded and 
    uses RequestAnimationFrame to run itself again and again.
    */
    function draw() {
        /*
        This calculates the velocity of the mouse by getting the distance between the last coordinates and 
        the new ones. The coordinates will be further apart depending on how fast the mouse is moving.
        */
        var mouse_xv = mouse.x - mouse.px;
        var mouse_yv = mouse.y - mouse.py;

        //Loops through all of the columns
        for (i = 0; i < vec_cells.length; i++) {
            var cell_datas = vec_cells[i];

            //Loops through all of the rows
            for (j = 0; j < cell_datas.length; j++) {

                //References the current cell
                var cell_data = cell_datas[j];

                //If the mouse button is down, updates the cell velocity using the mouse velocity
                if (mouse.down) {
                    change_cell_velocity(cell_data, mouse_xv, mouse_yv, pen_size);
                }

                //This updates the pressure values for the cell.
                update_pressure(cell_data);
            }
        }

        /*
        This line clears the canvas. It needs to be cleared every time a new frame is drawn
        so the particles move. Otherwise, the particles would just look like long curvy lines.
        */
        ctxParticle.clearRect(0, 0, canvasParticle.width, canvasParticle.height);

        //This sets the color to draw with.c
        var gradient = ctxParticle.createLinearGradient(95,15,15,102,20,40);
        gradient.addColorStop("0", 'yellow');
        gradient.addColorStop("0.5", 'red');
        gradient.addColorStop("0.75", 'purple');
        gradient.addColorStop("0.9", 'magenta');
        gradient.addColorStop("1", 'blue');
        ctxParticle.strokeStyle = gradient;

        //This calls the function to update the particle positions.
        update_particle();

        /*
        This calls the function to update the cell velocity for every cell by looping through
        all of the rows and columns.
        */
        for (i = 0; i < vec_cells.length; i++) {
            var cell_datas = vec_cells[i];

            for (j = 0; j < cell_datas.length; j++) {
                var cell_data = cell_datas[j];

                update_velocity(cell_data);

            }
        }

        //This replaces the previous mouse coordinates values with the current ones for the next frame.
        mouse.px = mouse.x;
        mouse.py = mouse.y;

        //This requests the next animation frame which runs the draw() function again.
        requestAnimationFrame(draw);

    }


    /*
    This function changes the cell velocity of an individual cell by first determining whether the cell is 
    close enough to the mouse cursor to be affected, and then if it is, by calculating the effect that mouse velocity
    has on the cell's velocity.
    */
    function change_cell_velocity(cell_data, mvelX, mvelY, pen_size) {
        //This gets the distance between the cell and the mouse cursor.
        var dx = cell_data.x - mouse.x;
        var dy = cell_data.y - mouse.y;
        var dist = Math.sqrt(dy * dy + dx * dx);

        //If the distance is less than the radius...
        if (dist < pen_size) {

            //If the distance is very small, set it to the pen_size.
            if (dist < 4) {
                dist = pen_size;
            }

            //Calculate the magnitude of the mouse's effect (closer is stronger)
            var power = pen_size / dist;

            /*
            Apply the velocity to the cell by multiplying the power by the mouse velocity and adding it to the cell velocity
            */
            cell_data.xv += mvelX * power;
            cell_data.yv += mvelY * power;
        }
    }


    /*
    This function updates the pressure value for an individual cell using the 
    pressures of neighboring cells.
    */
    function update_pressure(cell_data) {

        //This calculates the collective pressure on the X axis by summing the surrounding velocities
        var pressure_x = (
            cell_data.up_left.xv * 0.5 //Divided in half because it's diagonal
            + cell_data.left.xv
            + cell_data.down_left.xv * 0.5 //Same
            - cell_data.up_right.xv * 0.5 //Same
            - cell_data.right.xv
            - cell_data.down_right.xv * 0.5 //Same
        );

        //This does the same for the Y axis.
        var pressure_y = (
            cell_data.up_left.yv * 0.5
            + cell_data.up.yv
            + cell_data.up_right.yv * 0.5
            - cell_data.down_left.yv * 0.5
            - cell_data.down.yv
            - cell_data.down_right.yv * 0.5
        );

        //This sets the cell pressure to one-fourth the sum of both axis pressure.
        cell_data.pressure = (pressure_x + pressure_y) * 0.25;
    }


    /*
    This function updates the velocity value for an individual cell using the 
    velocities of neighboring cells.
    */
    function update_velocity(cell_data) {

        /*
        This adds one-fourth of the collective pressure from surrounding cells to the 
        cell's X axis velocity.
        */
        cell_data.xv += (
            cell_data.up_left.pressure * 0.5
            + cell_data.left.pressure
            + cell_data.down_left.pressure * 0.5
            - cell_data.up_right.pressure * 0.5
            - cell_data.right.pressure
            - cell_data.down_right.pressure * 0.5
        ) * 0.25;

        //This does the same for the Y axis.
        cell_data.yv += (
            cell_data.up_left.pressure * 0.5
            + cell_data.up.pressure
            + cell_data.up_right.pressure * 0.5
            - cell_data.down_left.pressure * 0.5
            - cell_data.down.pressure
            - cell_data.down_right.pressure * 0.5
        ) * 0.25;

        /*
        This slowly decreases the cell's velocity over time so that the fluid stops
        if it's left alone.
        */
        cell_data.xv *= 0.99;
        cell_data.yv *= 0.99;
    }


    //This function is used to create a cell object.
    function cell(x, y, res) {

        //This stores the position to place the cell on the canvas
        this.x = x;
        this.y = y;

        //This is the width and height of the cell
        this.r = res;

        //These are the attributes that will hold the row and column values
        this.col = 0;
        this.row = 0;

        //This stores the cell's velocity
        this.xv = 0;
        this.yv = 0;

        //This is the pressure attribute
        this.pressure = 0;

    }


    //This function is used to create a particle object.
    function particle(x, y) {
        this.x = this.px = x;
        this.y = this.py = y;
        this.xv = this.yv = 0;
    }


    /*
    This function is called whenever the mouse button is pressed. The event object is passed to 
    this function when it's called.
    */
    function mouse_down_handler(e) {
        e.preventDefault(); //Prevents the default action from happening (e.g. navigation)
        mouse.down = true; //Sets the mouse object's "down" value to true
    }


    //This function is called whenever the mouse button is released.    
    function mouse_up_handler() {
        mouse.down = false;
    }


    /*
    This function is called whenever the mouse coordinates have changed. The coordinates are checked by the 
    browser at intervals.
    */
    function mouse_move_handler(e) {
        //Saves the previous coordinates
        mouse.px = mouse.x;
        mouse.py = mouse.y;

        //Sets the new coordinates
        mouse.x = e.offsetX || e.layerX;
        mouse.y = e.offsetY || e.layerY;
    }
    /*
    And this line attaches an object called "Fluid" to the global scope. "window" was passed into
    the self-invoking function as "w", so setting "w.Fluid" adds it to "window".
    */
    w.Fluid = {
        initialize: init
    }

}(window)); //Passes "window" into the self-invoking function.


/*
Request animation frame polyfill. This enables you to use "requestAnimationFrame" 
regardless of the browser the script is running in.
*/
window.requestAnimationFrame = window.requestAnimationFrame || window.webkitRequestAnimationFrame || window.mozRequestAnimationFrame;


//And this line calls the init() function defined above to start the script.
Fluid.initialize();