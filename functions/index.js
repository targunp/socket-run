const functions = require('firebase-functions');
const admin = require('firebase-admin');
admin.initializeApp();
exports.createRunner = functions.firestore
    .document('runners/{runnerId}')
    .onWrite((change, runnersContext) => {
        const document = change.after.exists ? change.after.data() : null;
        if (!document || document.racing)
            return null;
        return admin
            .firestore()
            .collection("races")
            .where("open", "==", true)
            .get()
            .then((racesSnap) => {
                if (racesSnap.docs.length > 0) {
                    const now = new Date();
                    return racesSnap.docs[0].ref
                        .update({ open: false, start: new Date(now.getTime() + 24000)})
                        .then((result) => {
                            return racesSnap.docs[0].ref.collection("runners")
                                .doc(runnersContext.params.runnerId)
                                .set({ created: new Date() });
                        }).then((result) => {
                            return change.after.ref.update({ racing: true, currentRace: racesSnap.docs[0].ref.id });
                        });
                } else {
                    return admin
                        .firestore()
                        .collection("races")
                        .add({ open: true, created: new Date() })
                        .then((ref) => {
                            return ref.collection("runners")
                                .doc(runnersContext.params.runnerId)
                                .set({ created: new Date() }).then((result) => {
                                    return change.after.ref.update({ racing: true, currentRace: ref.id });
                                });
                        });
                    }
            });
    });
