<img src="http://i.imgur.com/6apYjTN.gif" align="right" style="float:right" height="300" />

## Jem.js

Just Erlang Maps for Javascript

## Why Jem.js?

Using JSON to communicate with an erlang server requires using resources to parse it and takes up more bandwidth than needed. Instead of sending plaintext JSON, you can use Jem.js to encode your JavaScript objects in the native Erlang binary format, so that, from the server, all that's needed is calling ``erlang:binary_to_term(Binary)`` to obtain the same representation of a JSON you would usually get from jiffy.

## How to use it?

The 2 functions Jem.js exposes are pretty straight forward and you can find usage examples in the examples directory (or even better, just try using [this Fiddle](https://jsfiddle.net/HernanR/51mxsfr0/1/)).

From the erlang side it's just as simple, all you need to do is replace ``jiffy:decode/1`` and ``jiffy:encode/1`` with ``binary_to_term/1`` and ``term_to_binary/1``.

For example, lets say we have this pretty straight forward Cowboy endpoint:

``` erlang
handle_post(Req, State) ->
  {ok, Body, Req1} = cowboy_req:body(Req),
  Decoded = jiffy:decode(Body, [return_maps]),
  Reply = do_whatever(Decoded),
  {jiffy:encode(Reply), Req1, State}.
```

With jem.js on the client, we could instead do this:

``` erlang
handle_post(Req, State) ->
  {ok, Body, Req1} = cowboy_req:body(Req),
  Decoded = erlang:binary_to_term(Body),
  Reply = do_whatever(Decoded),
  {erlang:term_to_binary(Reply), Req1, State}.
```

(just remember you are not accepting ``application/json`` but ``application/erlang`` on the content types)
