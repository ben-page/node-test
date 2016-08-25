### 1.3.1
- fix throws/notThrows fn not running

### 1.3.0
- reduced public footprint using symbols
- fixed callback hanging waiting for done
- t.async can proxy callbacks or be the callback and supports count
- long stack traces

### 1.2.4
- reenabled t.count

### 1.2.3
- updated not-so-shallow

### 1.2.2
- bug fixes

### 1.2.1
- bug fixes

### 1.2
- removed suite.setTimeout() added suite.config()
- changed t.count() back to t.async()

### 1.1.1
- fixed missing t.throws argument in documentation

### 1.1.0
- removed t.async()
- expanded t.throws() to handle both synchronous and asynchronous errors
- change t.async() to t.count()

### 1.0.11
- bug fix

### 1.0.10
- bug fix

### 1.0.9
- bug fix

### 1.0.8
- asynchronous assertions
- test timeouts
- color output on reporter

### 1.0.7
- Improved Documentation

### 1.0.6
- Use timers.setImmediate so that browserify works

### 1.0.5
- Added Fail Fast suite config

### 1.0.2
- Hooks Accept done() callback
- Improved Documentation

### 1.0.1
- First Release