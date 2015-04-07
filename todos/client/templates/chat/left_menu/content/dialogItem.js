Template.dialogItem.created = function () {
    var self = this;
    self.subscribe("lastDialogMessage", self.data._id);


    self.lastMessage = new ReactiveVar();
    self.unreadMessageCount = new ReactiveVar();
    self.onlineUsers = new ReactiveVar();
    self.offlineUsers = new ReactiveVar();

    this.autorun(function () {
        if (!Meteor.userId()) {
            return;
        }
        var message = Messages.findOne({dialogId: self.data._id}, {
            sort: {created: -1}
        });

        if (message) {
            var messageOwner = Meteor.users.findOne(message.ownerId);
            if (messageOwner) {
                if(message.removed){
                    self.lastMessage.set(Utils.getUsername(messageOwner) + " removed his message" );
                } else {
                    self.lastMessage.set(Utils.getUsername(messageOwner) + ": " + message.text);
                }

                if(message.ownerId !== Meteor.userId()){
                   /* Notification.requestPermission( function(status) {
                        console.log(status); // notifications will only be displayed if "granted"
                        var n = new Notification(Utils.getUsername(messageOwner), {body: message.text}); // this also shows the notification
                        n.onclick =  function(){
                            window.focus();
                        }
                    });*/
                }
            } else {
                self.lastMessage.set(message.text);
            }
        }
        Meteor.call("getUnreadMessagesCountForTimestamp",
            self.data._id,
            Meteor.user().profile.readTimestamps[self.data._id] || 0,
            Meteor.userId(), function (er, count) {
                if(!er){
                    IM.unreadMessagesForDialogsMap[self.data._id] = count;
                    self.unreadMessageCount.set(count);
                }
            });

    });

    this.autorun(function () {
        if (!Meteor.userId()) {
            return;
        }
        var reactiveDialog = Dialogs.findOne(self.data._id);
        var userPersences = UserPresences.find({userId: {$in: reactiveDialog.userIds, $ne: Meteor.userId()}}).fetch();
        var onlineCount = 0;
        userPersences.forEach(function (obj) {
            if (obj.state === "online" || obj.state === "idle") {
                onlineCount++;
            }
        });
        self.offlineUsers.set(reactiveDialog.userIds.length - 1 - onlineCount);
        self.onlineUsers.set(onlineCount);
    });

    self.title = IM.getChatName(self.data);
}
Template.dialogItem.helpers({
    title: function () {
        return Template.instance().title;
    },
    isVisible: function () {
        var filterString = IM.getFilterDialogsString();
        var currentDialog = IM.getCurrentDialog();
        var currentDialogId = currentDialog ? currentDialog._id : null;
        if (!filterString || currentDialogId === this._id) {
            return true;
        }
        var title = Template.instance().title;
        return title.toLowerCase().indexOf(filterString.toLowerCase()) > -1;
    },
    selected: function () {
        var currentDialog = IM.getCurrentDialog();
        if (currentDialog && currentDialog._id === this._id) {
            return "selected";
        }
    },
    typeClass: function () {
        if (this.type === DialogTypes.ONE_TO_ONE) {
            return "one-to-one";
        } else if (this.type === DialogTypes.CHANNEL) {
            return "channel";
        } else if (this.type === DialogTypes.ROOM) {
            return "room";
        }
    },
    isOneToOne: function () {
        return this.type === DialogTypes.ONE_TO_ONE;
    },
    unreadCount: function () {
        return Template.instance().unreadMessageCount.get();
    },
    lastMessage: function () {
        return Template.instance().lastMessage.get();
    },
    onlineCount: function () {
        return Template.instance().onlineUsers.get();
    },
    offlineCount: function () {
        return Template.instance().offlineUsers.get();
    },
    opponentId: function(){
        if(this.type === DialogTypes.ONE_TO_ONE){
            return _.without(this.userIds, Meteor.userId())[0];
        }
    }
});
