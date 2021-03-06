Template.libraryDialog.onCreated(function(){
	this.userId = new ReactiveVar();
	this.autorun(() => {
		var library = Libraries.findOne(Template.currentData().libraryId, {
			fields: {readers: 1, writers: 1, owner: 1}
		});
		if (!library) return;
		this.subscribe("userNames", _.union(library.readers, library.writers, [library.owner]));
	});
});

Template.libraryDialog.helpers({
  library(){
    return Libraries.findOne(this.libraryId);
  },
  readers: function(){
		var library = Libraries.findOne(this.libraryId, {fields: {readers: 1}});
		return library && library.readers;
	},
	writers: function(){
		var library = Libraries.findOne(this.libraryId, {fields: {writers: 1}});
		return library && library.writers
	},
	username: function(id){
		const user = Meteor.users.findOne(id);
		return user && user.username || "user: " + id;
	},
	shareButtonDisabled: function(){
		return !Template.instance().userId.get();
	},
	userFindError: function(){
		if (!Template.instance().userId.get()){
			return "User not found";
		}
	},
});

Template.libraryDialog.events({
  "input #libraryNameInput": _.debounce(function(event){
		const input = event.currentTarget;
		var name = input.value;
		if (!name){
			input.invalid = true;
			input.errorMessage = "Name is required";
		} else {
			input.invalid = false;
			Libraries.update(this.libraryId, {
				$set: {name}
			}, {
				removeEmptyStrings: false,
				trimStrings: false,
			});
		}
	}, 300),
  "click #deleteButton": function(){
    Meteor.call("removeLibrary", this.libraryId);
    popDialogStack();
  },
  "input #userNameOrEmailInput":
	function(event, instance){
		var userName = instance.find("#userNameOrEmailInput").value;
		instance.userId.set(undefined);
		Meteor.call("getUserId", userName, function(err, result) {
			if (err){
				console.error(err);
			} else {
				console.log(result);
				instance.userId.set(result);
			}
		});
	},
  "click #shareButton": function(event, instance){
		var self = this;
		var permission = instance.find("#accessLevelMenu").selected;
		if (!permission) throw "no permission set";
		var userId = instance.userId.get();
		if (!userId) return;
		if (permission === "write"){
			Libraries.update(self.libraryId, {
				$addToSet: {writers: userId},
				$pull: {readers: userId},
			});
		} else {
			Libraries.update(self.libraryId, {
				$addToSet: {readers: userId},
				$pull: {writers: userId},
			});
		}
	},
  "click .deleteShare": function(event, instance) {
		Libraries.update(instance.data.libraryId, {
			$pull: {writers: this.id, readers: this.id}
		});
	},
});
