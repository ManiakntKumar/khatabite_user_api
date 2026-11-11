const otpService=require("../services/otp.service");


//// =========SEND OTP==============================
exports.sendOTP=async(req,res)=>{
   try{
      const {mobile}=req.body;
      if(!mobile){
         return res.status(400).json({
            success:false,
            message:"Mobile number required"
         });
      }
      const response=await otpService.sendOTP(mobile);
      return res.json(response);
   }
   catch(error){
      return res.status(500).json({
         success:false,
         message:error.message
      });
   }
}



/////================ OTP VERIFICATION============================
exports.verifyOTP=async(req,res)=>{
   try{
      const {mobile,otp}=req.body;
      const response=await otpService.verifyOTP(mobile,otp);
      return res.json(response);
   }
   catch(error){
      return res.status(500).json({
         success:false,
         message:error.message
      });

   }

}