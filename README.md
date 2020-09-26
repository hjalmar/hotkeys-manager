# hotkeys-manager
Executes callback when hotkey commands are pressed.

# Install
```
npm i -D hotkeys-manager
```

# Initialize
import HotkeysManager from 'hotkeys-manager';
```js
// settings these options in the constructor defines these options 
// globaly thorughout command registrations. Though individual options 
// have precedence over those defined globally.  
const options = {
  // defaults
  preventDefault: true,
  once: true,
}
// new ShortcutsManager(Element, Object);
const hotkeys = new HotkeysManager(window, options);
// returns the target Element the eventlisteners are bound to
hotkeys.target; // reference to the element passed in to the HotkeysManager constructor. the `window` object in this case
```

## Register command
The available options consists of these properties. 
```js
// optional options
{
  once: Boolean // if global option has been set, this option overrides it
  preventDefault: Boolean // same with preventDefault. This overrides the global value
  data: Any
  groups: Array,
  priority: Number // which command has precendence of being triggered
}
```
Define a new command with the `set` method on the shortcuts instance. `once` and `preventDefault` options overrides any options defined globally. Data is where you can pass any data which you have access to in the callback.
```js
// shortcuts.set(Array<KeyboardEvent.code>, options);
const open = hotkeys.set(['ControlLeft', 'KeyO'], { 
  once: true,
  preventDefault: true,
  data: 'this command opens something', 
  groups: ['group1'],
  priority: 3
});
```

Adding callbacks for on and off states.
```js
// on
open.on(({ e, Hotkey, on }) => {
  // handle on state
});

// off 
open.off(({ e, Hotkey, on }) => {
  // handle off state
});
```

## Groups
If no groups is provided the command will be stored under a global wildcard group `[*]`. If you want to register a shortcut to the wildcard group along with other groups, simply add that to the array list as well. Like so.
```js
groups: ['*', 'group1', 'group2']
```

Enabling certain groups to be listened to.
```js
// returns the same arguments provided, as an array
const groupsArray = hotkeys.enableGroups('group1', 'group2');
```

Enabling all groups is a special case where it listens for all registered commands. And pick the first registered or the one with the highest priority.
```js
// enable all groups (default)
hotkeys.enableAllGroups();
```

## Listening
To start listening for bound hotkeys call the subscribe method on the instance. This in turn returns an unsubscribe method. These methods add and removes the eventlisteners.

```js
const unsubscribe = hotkeys.subscribe();
```

Providing a callback function as the subscribe argument you can catch all events here instead of binding `on` and `off` on each seperate hotkey. 

This callback will be called for both on and off states. The `on` argument returns a `boolean` with the value `true|false` to differentiate between on and off state.
```js
const unsubscribe = hotkeys.subscribe(({ e, Hotkey, on }) => {
  // here we are still able to access the `event` object
  // so it's possible to prevent the default behaviour or 
  // stopPropagation if we so like.
  e.preventDefault();
  // along with the current Hotkey Shortcut instance
  console.log(Hotkey);
});
```