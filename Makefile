CFLAGS = `pkg-config --cflags --libs opencv` \
	-I /opt/boost/include \
	/opt/boost/lib/libboost_system.a

%: %.cpp
	g++ $(CFLAGS) $(LIBS) -o $@ $<