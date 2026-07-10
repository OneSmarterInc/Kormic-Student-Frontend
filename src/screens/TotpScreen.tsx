import React, { useRef, useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  Alert,
  SafeAreaView,
} from "react-native";


interface TotpScreenProps {
  onContinue: () => void;
}

export default function TotpScreen({ onContinue }: TotpScreenProps) {

  const [otp, setOtp] = useState([
    "",
    "",
    "",
    "",
    "",
    ""
  ]);

  const inputRefs = useRef<TextInput[]>([]);


  const handleChange = (text: string, index: number) => {

    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);


    if(text && index < 5){
      inputRefs.current[index + 1]?.focus();
    }

  };


  const handleBackspace = (index:number) => {

    if(!otp[index] && index > 0){
      inputRefs.current[index-1]?.focus();
    }

  };


  const verifyOTP = () => {

    const code = otp.join("");

    if(code.length !== 6){
      Alert.alert(
        "Invalid OTP",
        "Please enter complete 6 digit code"
      );
      return;
    }

    Alert.alert(
      "Success",
      "Code verified.",
      [{ text: "Continue", onPress: onContinue }]
    );

  };


  return (

    <SafeAreaView style={styles.container}>

      <View style={styles.card}>


        <View style={styles.logo}>
          <Text style={styles.logoText}>
            🔐
          </Text>
        </View>


        <Text style={styles.title}>
          Verify TOTP
        </Text>


        <Text style={styles.description}>
          Enter the 6-digit code from your authenticator app
          {"\n"}
          to continue securely.
        </Text>



        <View style={styles.otpContainer}>

          {
            otp.map((value,index)=>(

              <TextInput

                key={index}

                ref={(ref)=>{
                  if(ref){
                    inputRefs.current[index]=ref;
                  }
                }}

                style={styles.otpInput}

                value={value}

                keyboardType="number-pad"

                maxLength={1}

                onChangeText={(text)=>
                  handleChange(text,index)
                }


                onKeyPress={(e)=>{

                  if(
                    e.nativeEvent.key==="Backspace"
                  ){
                    handleBackspace(index);
                  }

                }}

              />

            ))
          }


        </View>



        <Pressable
          style={styles.button}
          onPress={verifyOTP}
        >

          <Text style={styles.buttonText}>
            Verify Code
          </Text>

        </Pressable>



        <Text style={styles.resend}>
          Didn't receive code?
          {" "}

          <Text style={styles.resendLink}>
            Resend
          </Text>

        </Text>



        <Text style={styles.security}>
          Your account is protected with two-factor authentication.
        </Text>



      </View>


    </SafeAreaView>

  );

}



const styles = StyleSheet.create({

  container:{
    flex:1,
    backgroundColor:"#15162b",
    justifyContent:"center",
    alignItems:"center",
  },


  card:{
    width:"90%",
    backgroundColor:"#1e293b",
    padding:30,
    borderRadius:20,
    alignItems:"center",

    shadowColor:"#000",
    shadowOpacity:0.1,
    shadowRadius:10,
    elevation:5,
  },


  logo:{
    width:70,
    height:70,
    borderRadius:35,
    backgroundColor:"#f2593b",
    justifyContent:"center",
    alignItems:"center",
  },


  logoText:{
    fontSize:30,
  },


  title:{
    fontSize:24,
    fontWeight:"700",
    color:"#1e293b",
    marginTop:20,
  },


  description:{
    textAlign:"center",
    color:"#8697af",
    fontSize:14,
    marginTop:12,
    lineHeight:22,
  },


  otpContainer:{
    flexDirection:"row",
    justifyContent:"space-between",
    marginTop:25,
    width:"100%",
  },


  otpInput:{
    width:42,
    height:48,
    borderWidth:1,
    borderColor:"#cbd5e1",
    borderRadius:10,
    textAlign:"center",
    fontSize:22,
    color:"#fff",
  },


  button:{
    width:"100%",
    height:45,
    backgroundColor:"#f2593b",
    borderRadius:10,
    justifyContent:"center",
    alignItems:"center",
    marginTop:30,
  },


  buttonText:{
    color:"#fff",
    fontSize:16,
    fontWeight:"600",
  },


  resend:{
    marginTop:20,
    color:"#64748b",
    fontSize:14,
  },


  resendLink:{
    color:"#2563eb",
    fontWeight:"700",
  },


  security:{
    marginTop:25,
    fontSize:12,
    color:"#94a3b8",
    textAlign:"center",
  },


});