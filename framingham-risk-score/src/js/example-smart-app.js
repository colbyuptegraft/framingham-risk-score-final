(function(window){
  window.extractData = function() {
    var ret = $.Deferred();

    function onError() {
      console.log('Loading error', arguments);
      ret.reject();
      }

    // Coefficients for Men
      var age_men = 52.00961;
      var tcl_men = 20.014077;
      var hdl_men = -0.905964;
      var sbp_men = 1.305784;
      var bpTx_men = 0.241549;
      var smk_men = 12.096316;
      var ageTcl_men = -4.605038;
      var ageSmk_men = -2.84367;
      var age2_men = -2.93323;
      var con_men = 172.300168;

    // Coefficients for Women
      var age_women = 31.764001;
      var tcl_women = 22.465206;
      var hdl_women = -1.187731;
      var sbp_women = 2.552905;
      var bpTx_women = 0.420251;
      var smk_women = 13.07543;
      var ageTcl_women = -5.060998;
      var ageSmk_women = -2.996945;
      var con_women = 146.5933061;

    // Other variables
      var rxClassBase = "https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json?rxcui=";
      
    function onReady(smart)  {
      if (smart.hasOwnProperty('patient')) {
        var patient = smart.patient;
        var pt = patient.read();
        var obv = smart.patient.api.fetchAll({
                    type: 'Observation',
                    query: {
                      code: {
                            $or: [
                                  'http://loinc.org|8462-4', // DBP
                                  'http://loinc.org|8480-6', // SBP
                                  'http://loinc.org|2085-9', // HDL
                                  'http://loinc.org|2089-1', // LDL
                                  'http://loinc.org|2093-3', // Total Cholesterol
                                  'http://loinc.org|55284-4', // Blood pressure systolic & diastolic
                                  'http://loinc.org|30525-0', // Age
                                  'http://loinc.org|21611-9', // Age (estimated)
                                  'http://loinc.org|21612-7', // Age (reported)
                                  'http://loinc.org|29553-5', // Age (calculated)
                                  'http://loinc.org|72166-2', // Tobacco smoking status in social history
                                  'http://loinc.org|81229-7', // Tobacco smoking status - Tobacco Smoker
                                  'http://loinc.org|11366-2', // Tobacco use status
                                  'http://loinc.org|11367-0', // Tobacco use status
                                  'http://loinc.org|39240-7', // Tobacco use status
                                  'http://loinc.org|2571-8', // Triglycerides (mass/volume in Serum or plasma)
                                  'http://loinc.org|3043-7', // Triglycerides (mass/volume in Blood)
                                  'http://loinc.org|3049-4', // Triglycerides (mass/volume in serum or plasma) - Deprecated
                                ] 
                          
                      }
                    }
        });
                     
          var meds = smart.patient.api.fetchAll({
              type: 'MedicationDispense',
              query: {
                  status: "completed"
                  //code: 'http://www.nlm.nih.gov/research/umls/rxnorm|153666' // "irbesartan 150 MG Oral Tablet [Avapro]"
              }
                            
          });

        $.when(pt, obv, meds).fail(onError);

        $.when(pt, obv, meds).done(function(patient, obv, meds) {

          var byObvCodes = smart.byCodes(obv, 'code');            
          var gender = patient.gender;
          var fname = '';
          var lname = '';

          if (typeof patient.name[0] !== 'undefined') {
            fname = patient.name[0].given.join(' ');
            lname = patient.name[0].family.join(' ');
            }

            var tgl = byObvCodes('2571-8', '3043-7', '3049-4');
            var smk = byObvCodes('72166-2', '81229-7', '11366-2', '11367-0', '39240-7');
            var sbp_formatted = getBloodPressureValueAndUnit(byObvCodes('55284-4'),'8480-6');
            var dbp_formatted = getBloodPressureValueAndUnit(byObvCodes('55284-4'), '8462-4');
            var sbp = getBloodPressureValue(byObvCodes('55284-4'), '8480-6');
            var dbp = getBloodPressureValue(byObvCodes('55284-4'), '8462-4');
            var hdl = byObvCodes('2085-9');
            var ldl = byObvCodes('2089-1');
            var tcl = byObvCodes('2093-3');

            var medications = smk[0];       
           
          var p = defaultPatient();
          p.birthdate = patient.birthDate;
          p.gender = gender;
          p.fname = fname;
          p.lname = lname;
          p.age = getAge(p.birthdate);

            var onBpMeds;

            if (typeof medications != 'undefined') {
                
                rxNormCuis = getRxCuis(meds);
                
                var medClassCheck = "antihypertensive agents";
                var medClassCheckArray = [];

                for (i = 0; i < rxNormCuis.length; i++) {

                    var rxGetString = JSON.stringify(httpGet(rxClassBase.concat(rxNormCuis[i]))).toLowerCase();
                    var isBpMed = rxGetString.includes(medClassCheck);
                    medClassCheckArray.push(isBpMed);
                }

                if (medClassCheckArray.includes(true)) {
                    onBpMeds = 1;
                } else {
                    onBpMeds = 0;
                }                

                /*
                var medClassCheck = "antihypertensive agents";
                var rxGetString = JSON.stringify(httpGet(rxClassBase.concat(rxNormCuis[0]))).toLowerCase();
                var isBpMed = rxGetString.includes(medClassCheck);
                var medClassCheckArray = [true, false];
                medClassCheckArray.push(isBpMed);
                var onBpMeds = medClassCheckArray.includes(true);
                */
               // var rxNorm = httpGet("https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json?rxcui=149");

               // var rxNorm = httpGet(rxClassBase.concat(rxNormCuis[0]));

               // var medClass = rxNorm.rxclassDrugInfoList.rxclassDrugInfo[0].rxclassMinConceptItem.className;
                    
              //p.meds = medClass.toLowerCase();    
              //p.meds = JSON.stringify(rxNorm);
              //p.meds = getRxNormCodes(meds)[0];
               p.meds = onBpMeds.toString();
              // p.meds = onBloodPressureMeds(rxNormCuis).toString();
            } else {
                p.meds = 'medications undefined';
            }


            if (typeof smk != 'undefined') {
                p.smk = getSmokingStatus(smk[0]);
            } else {
                p.smk = 'smk undefined';
            }
          
            if (typeof sbp_formatted != 'undefined')  {
                p.sbp = sbp_formatted;
            }

            if (typeof dbp_formatted != 'undefined') {
                p.dbp = dbp_formatted;
            }

          p.hdl = getQuantityValueAndUnit(hdl[0]);
          p.ldl = getQuantityValueAndUnit(ldl[0]);
          p.tcl = getQuantityValueAndUnit(tcl[0]);
          p.tgl = getQuantityValueAndUnit(tgl[0]);

          // Risk Calculation
            var risk;

            if (gender == 'female') {

                risk = age_women * ln(p.age) +
                    tcl_women * ln(getQuantityValue(tcl[0])) +
                    hdl_women * ln(getQuantityValue(hdl[0])) +
                    sbp_women * ln(sbp) +
                    bpTx_women * onBpMeds +
                    smk_women;

            } else {

                risk = age_men * ln(p.age) +
                    tcl_men * ln(getQuantityValue(tcl[0])) +
                    hdl_men * ln(getQuantityValue(hdl[0])) +
                    sbp_men * ln(sbp) +
                    bpTx_men * onBpMeds +
                    smk_men;

            }

            p.risk = risk;

          ret.resolve(p);
        });

      } else {

          onError();

      }
    }

    FHIR.oauth2.ready(onReady, onError);
    return ret.promise();

  };

  function defaultPatient(){
    return {
      fname: {value: ''},
      lname: {value: ''},
      gender: {value: ''},
      birthdate: {value: '' },
      age: {value: ''},
      sbp: {value: ''},
      dbp: {value: ''},
      ldl: {value: ''},
      hdl: {value: '' },
      tcl: {value: '' },
      smk: {value: '' },
      tgl: {value: '' },
      meds: {value: '' },
      risk: {value: '' },
    };
    }

    function ln(num) {
        return Math.log(num);
    }
    
    function getRxCuis(medications) {
        
        var rxCuis = [];

        for (i = 0; i < Object.keys(medications).length; i++) {
            var code = medications[i].medicationCodeableConcept.coding[0].code
            rxCuis.push(code);
        }
        
        return rxCuis;
    }
/*
    function onBloodPressureMeds(rxNormCuis) {

        var medClassCheck = "antihypertensive agents";
        var medClassCheckArray = [];

        for (i = 0; i < rxNormCuis.length; i++) {

            var rxGetString = JSON.stringify(httpGet(rxClassBase.concat(rxNormCuis[i]))).toLowerCase();
            var isBpMed = rxGetString.includes(medClassCheck);
            medClassCheckArray.push(isBpMed);
        }

        var onBpMeds = medClassCheckArray.includes(true);
        return onBpMeds;
    }
 */
  function getBloodPressureValueAndUnit(BPObservations, typeOfPressure) {
    var formattedBPObservations = [];
    BPObservations.forEach(function(observation){
      var BP = observation.component.find(function(component){
        return component.code.coding.find(function(coding) {
          return coding.code == typeOfPressure;
        });
      });
      if (BP) {
        observation.valueQuantity = BP.valueQuantity;
        formattedBPObservations.push(observation);
      }
    });
    return getQuantityValueAndUnit(formattedBPObservations[0]);
  }

    function getBloodPressureValue(BPObservations, typeOfPressure) {
        var formattedBPObservations = [];
        BPObservations.forEach(function (observation) {
            var BP = observation.component.find(function (component) {
                return component.code.coding.find(function (coding) {
                    return coding.code == typeOfPressure;
                });
            });
            if (BP) {
                observation.valueQuantity = BP.valueQuantity;
                formattedBPObservations.push(observation);
            }
        });
        return getQuantityValue(formattedBPObservations[0]);
    }

  function getQuantityValueAndUnit(ob) {
    if (typeof ob != 'undefined' &&
        typeof ob.valueQuantity != 'undefined' &&
        typeof ob.valueQuantity.value != 'undefined' &&
        typeof ob.valueQuantity.unit != 'undefined') {
          return ob.valueQuantity.value + ' ' + ob.valueQuantity.unit;
    } else {
      return undefined;
    }
    }

    function getQuantityValue(ob) {
        if (typeof ob != 'undefined' &&
            typeof ob.valueQuantity != 'undefined' &&
            typeof ob.valueQuantity.value != 'undefined') {
            return ob.valueQuantity.value;
        } else {
            return undefined;
        }
    }

    function getAge(dateString) { // birthday is a string
        var today = new Date();
        var birthDate = new Date(dateString);
        var age = today.getFullYear() - birthDate.getFullYear();
        var m = today.getMonth() - birthDate.getMonth();
        if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) {
            age--;
        }
        return age;
    }

    function getSmokingStatus(ob) {
        if (typeof ob != 'undefined' &&
            typeof ob.valueCodeableConcept != 'undefined' &&
            typeof ob.valueCodeableConcept.coding != 'undefined' &&
            typeof ob.valueCodeableConcept.coding[0].display != 'undefined') {
                return ob.valueCodeableConcept.coding[0].display;
        } else {
            return undefined;
        }
    }

    function httpGet(theUrl) {
        var xmlHttp = new XMLHttpRequest();
        xmlHttp.open("GET", theUrl, false); // false for synchronous request
        xmlHttp.send(null);
        return JSON.parse(xmlHttp.responseText);
    }
   
  window.drawVisualization = function(p) {
    $('#holder').show();
    $('#loading').hide();
    $('#fname').html(p.fname);
    $('#lname').html(p.lname);
    $('#gender').html(p.gender);
    $('#birthdate').html(p.birthdate);
    $('#age').html(p.age);
    $('#sbp').html(p.sbp_formatted);
    $('#dbp').html(p.dbp_formatted);
    $('#ldl').html(p.ldl);
    $('#hdl').html(p.hdl);
    $('#tcl').html(p.tcl);
    $('#smk').html(p.smk);
    $('#tgl').html(p.tgl);
    $('#meds').html(p.meds);
    $('#risk').html(p.risk);
  };

})(window);
