var VerifyEmailDialog=function(a){Dialog.call(this,a,{dynamicHeight:!0,closeButtonEnabled:!0,title:Strings.translateString("Verify Your Email Address"),nextButtonText:Strings.translateString("Send Verification Email"),buttonAlign:this.CENTER_ALIGN})};VerifyEmailDialog.prototype=Object.create(Dialog.prototype);VerifyEmailDialog.prototype.constructor=VerifyEmailDialog;VerifyEmailDialog.prototype.handleSubmit=function(){LPProxy.makeRequest(LPProxy.sendVerificationEmail,{parameters:this.data.email,success:function(a){Topics.get(Topics.SUCCESS).publish(a)}})};
