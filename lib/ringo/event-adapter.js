
export('JavaEventAdapter');

/**
 * A utility class to ease work with event based java classes. This includes:
 *
 * <ul>
 * <li>A wrapper registry for automatically wrapping java objects in callbacks</li>
 * <li>An addListener method that automatically generates a java adapter for a given
 *     class or interface from a javascript function</li>
 * <li>A try-catch wrapper around callbacks to display error info</li>
 * </ul>
 */
function JavaEventAdapter() {
    var wrappers = [];

    this.addWrapper = function(javaClass, wrapper) {
        wrappers.push({javaClass: javaClass, wrapper: wrapper});
    };

    this.addListener = function(object, callback, classOrInterface, listenerMethod) {
        // try addListener method
        var addMethod = "addListener";
        if (typeof object[addMethod] != "function") {
            // try addFooBarListener with FooBarListener being the class name
            var className = classOrInterface.__javaClass__.getSimpleName();
            addMethod = "add" + className;
        }
        if (typeof object[addMethod] != "function") {
            throw new Error("addListener method not found for " +
                    classOrInterface + " in " + object);
        }
        function invokeWrapped(callback) {
            return function() {
                try {
                    for (var i = 0; i < arguments.length; i++) {
                        for each (var mapping in wrappers) {
                            if (arguments[i] instanceof mapping.javaClass) {
                                arguments[i] = new mapping.wrapper(arguments[i]);
                            }
                        }
                    }
                    return callback.apply(this, arguments);
                } catch (error) {
                    print(error);
                    if (error.stack)
                        print(error.stack);
                }
            }
        }
        var impl;
        if (listenerMethod) {
            impl = {};
            impl[listenerMethod] = invokeWrapped(callback);
        } else {
            impl = invokeWrapped(callback);
        }
        object[addMethod](new JavaAdapter(classOrInterface, impl))
    };

}

