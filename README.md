# functionflowx
> Control how the javascript functions will be executed.

- methods which will execute JS functions in serial or parallel order
- repeat multiple serial/parallel bundled functions
- start, stop, pause the function execution
- no npm dependencies

The FunctionFlow® controls whether functions will be executed in serial or in parallel sequence. It gives the possibility for iterative repetition of serial or parallel function sequence. It defines time delays between every function execution step. Finally, it controls the whole process to start, stop or pause.
There is some similarity with the async npm library but FunctionFlow is much more powerful because it uses JS Promises and async/await.


## Installation
```bash
$ npm install --save functionflowx
```


## Example
```js
/*** NodeJS script ***/
const { EventEmitter } = require('events');
const FunctionFlow = require('functionflowx');


// functions
const f1 = (x, lib) => {
  x++;
  console.log('f1::', x);
  return x;
};

const f2 = (x, lib) => {
  x++;
  console.log('f2::', x);
  return x;
};

const f3 = function (x, lib) {
  x++;
  console.log('f3::', x);
  console.log('this::', this); // {}
  console.log('lib::', lib); // {evenEmitter,ff}
  return x;
};


// main
const main = async (input, eventEmitter) => {
  const ff = new FunctionFlow({ debug: true, msDelay: 800 }, eventEmitter);

  const x = input;
  const lib = { eventEmitter, ff };
  ff.xInject(x);
  ff.libInject(lib);

  await ff.serial([f1, f2, f3, f1]);
  await ff.delay(3400);

  return ff.x;
};


// execute main
const inp = 5;
const eventEmitter = new EventEmitter();
main(inp, eventEmitter)
  .then(res => console.log('RES:: ', res))
  .catch(err => console.error('ERR:: ', err));
```

Other examples are in /tests/ folder.



## API

#### constructor(opts:{debug:boolean, msDelay:number}, eventEmitter:EventEmitter)
- debug - show debug message
- msDelay - delay between functions
- eventEmitter - NodeJS event emitter object (connects with outer code)


#### xInject(x:any) :void
Inject x (transitional variable) in function first parameter - func(x, lib).

#### libInject(lib:object) :void
Inject libraries like Cheerio, Puppeteer, ...etc. in function second parameter - func(x, lib).

#### libAdd(lib:object) :void
Add libraries to libraries already injected by libInject().

#### libRemove() :void
Remove all libraries.

#### libList() :array
List all libraries.


### /*=========== FUNCTION  BUNDLERS ==============*/

#### async serial(funcs:function[]) :any
Execute funcs functions one by one.
```
input------>|--f0-->|msDelay|--f3-->|msDelay|--f2-->|msDelay|------>output
```

#### async serialEach(funcs:function[], arr:array) :any
Execute funcs functions one by one and repeat it for every array element.
The funcs chain is repeated the arr.length times. The "arr" element is stored in the "lib.serialEachElement" and can be used inside the function.
```
input------>|--f0-->|msDelay|--f3-->|msDelay|--f2-->|msDelay|------>output
            |                                            arr|
            |<--------------repeat arr.length --------------|
```

#### async serialRepeat(funcs:function[], n:number) :any
Execute funcs functions one by one and repeat it n times.
The funcs chain is repeated the n times. The iteration number is stored in the "lib.serialRepeatIteration" and can be used in the function.
```
input------>|--f0-->|msDelay|--f3-->|msDelay|--f2-->|msDelay|------>output
            |                                              n|
            |<-------------------repeat n ------------------|
```

#### async one(func:function) :any
Execute just one function.

#### async parallelAll(funcs:function[]) :any
Take any defined function and execute simultaneously. All defined functions must return fulfilled promises. Input is same for all functions. Returned value is an array of resolved values.
```
         --> |--------- f2(x) ---------->---|
-- input --> |--------- f4(x) ------->------|msDelay|---> [r2, r4, r8]
         --> |--------- f8(x) ------------->|
```

#### async parallelRace(funcs:function[]) :any
Run functions in paralell. Fastest function must return fulfilled promise. Returned value is value from first resolved (fastest) function.
```
         --> |--------- f2(x) --------|-->
-- input --> |--------- f4(x) ------->|msDelay|---> r4
         --> |--------- f8(x) --------|----->
```


### /*=========== ITERATION  METHODS ==============*/
#### async repeat(n:number) :any
Repeat last executed FunctionFlow bundle method (serial, serialEach, ...) n times.



### /*=========== COMMANDS ==============*/
#### stop() :void
Stops the execution of all functions used in bundle methods (serial, one or parallel). Condition: status = 'start'.
```
ff.stop(); // inside function
eventEmitter.emit('ff-stop'); // out of function
```

#### start() :void
Starts/restarts function flow execution if it's previously been stopped or paused. Condition: status = 'pause' | 'stop'.
```
ff.start(); // inside function
eventEmitter.emit('ff-start'); // out of function
```

#### pause() :void
Pauses function flow execution used in bundle methods (serial, one or parallel). Condition: status = 'start'.
```
ff.pause(); // inside function
eventEmitter.emit('ff-pause'); // out of function
```


#### go(goTo:number) :void
Go to the function used in the serial(funcs) method. Parameter goTo is the index number of funcs array and the condition 0 <= goTo < funcs.length must be fulfilled. When the execution of that function is finished, continue with the next function in funcs array.
It's usually used to go to another function which is in the serial() method.
```
f2.js
------------------
module.exports = (x, lib) => {
  x++;
  lib.echo.log('f2:: ', x);
  if (x < 13 ) { lib.ff.go(1); } // go back to f1
  return x;
};
```

#### next() :void
Stop execution of all funcs functions in serial(funcs) method and continue with the next serial, one or parallel bundle method.
It will work only inside a function used in the serial() method. A parameter is not needed for this method.
```
f2.js
------------------
module.exports = (x, lib) => {
  x++;
  lib.echo.log('f2::', x);
  lib.ff.next();
  return x;
};
```

#### jump(jumpTo:number) :void
Jump to iteration number defined in the repeat(n) method. When that iteration is executed continue with the next iteration in repeat(n) method. The current iteration will finish with all its functions.
Parameter jumpTo is the iteration number and the condition 0 < jumpTo <= n must be fulfilled.
It's usually used to skip some iterations under certain conditions. To get a current iteration number use ff.iteration.
```
f2.js
------------------
module.exports = (x, lib) => {
  x++;
  lib.echo.log('f2::', x);
  if (lib.ff.iteration === 2) { lib.ff.jump(10); } // on 2nd iteration jump to last iteration
  return x;
};
```

#### break() :void
Breaks all iterations in repeat(n) method. Parameter is not required. The current iteration will finish with all its functions.
It sets this.jumpTo = Infinity. It's used inside the function to stop all repeats (iterations).
```
ffunc.js
------------------
module.exports = (x, lib) => {
  x++;
  if (x.val > 2) { lib.ff.break(); } // stop iterations defined in main.js by ff.repeat(n);
  return x;
};
```


### /*=========== DELAYS ==============*/
#### delay(ms:number) :void
Delay in miliseconds.
```
await ff.delay(3400); // delay of 3.4 seconds
```

#### delay(msMin:number, msMax:number) :void
Random delay from msMin to msMax.
```
await ff.delayRnd(3000, 8000); // delay between 3 and 8 seconds
```





### License
The software licensed under [AGPL-3](LICENSE).
