MOCHA_OPTS= --check-leaks
REPORTER = nyan

test: test-unit

test-unit:
	@NODE_ENV=test ./node_modules/.bin/mocha \
		--reporter $(REPORTER) \
		$(MOCHA_OPTS)

# CV program
CC = g++ -std=c++11
OPENCV = `pkg-config --cflags --libs opencv`
UV_PATH = libuv
UV_LIB = $(UV_PATH)/libuv.a
UV = -g -Wall -I$(UV_PATH)/include -framework CoreServices

# BOOST = -I /opt/boost/include \
	# /opt/boost/lib/libboost_system.a

test-server:
	$(CC) $(UV) server-test.cpp -o test-server

%: %.cpp
	$(CC) $(OPENCV) -o $@ $<


.PHONY: test test-unit test-server client