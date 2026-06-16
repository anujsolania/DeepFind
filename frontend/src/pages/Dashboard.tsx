
import { supabase } from "@/lib/supabase"
import type { User } from "@supabase/supabase-js";
import axios from "axios";
import { useEffect, useState } from "react"
import { useNavigate } from "react-router";




export default function Dashboard() {
    const navigate = useNavigate();
    const [user, setUser] = useState< User | null>(null);

    useEffect(() => {
        async function fetchUser() {
            const { data, error } = await supabase.auth.getUser()
            if (error) {
                console.error("Error fetching user data:", error)
                return
            }
            setUser(data.user);
            console.log("Get user: ", data)
        }
        fetchUser()
    }, [])

    useEffect(() => {
        async function fetchConversations(){
            try{
                const { data : {session} } = await supabase.auth.getSession()
                const response = await axios.get("http://localhost:3000/conversations", {
                    headers: {
                        // Authorization: `Bearer ${session?.access_token}`,
                        Authorization: session?.access_token,

                     }, 
                })
                console.log("user id from /conversations", response.data);  
            } catch (error) {
                console.error("Error fetching conversations:", error)
            }
        }
        fetchConversations()
    }, [])
    return (
        <div>
            {!user ? (
                <button onClick={() => {
                    navigate("/auth")
                }}> Go to SIGIN</button>
            ) : (
                user && <div>
                    user email : {user?.email}
                    <button onClick={() => {
                        supabase.auth.signOut();
                        setUser(null);
                        navigate("/")
                    }} >LOGOUT</button>
                    </div> 
               
            )}
        </div>
    )
}