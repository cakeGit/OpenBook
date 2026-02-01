import "./style.css";

export function UserInfo({ pfp, email, name }) {
    return (
        // <div className="user_info_container">

        //     <img src={pfp} alt="User profile picture" className="user_info_pfp" referrerPolicy="no-referrer"/>

        //     <div>
        //         <h3>{name}</h3>
        //         <p className="user_info_email">{email}</p>
        //     </div>

        // </div>

        <div className="display_user_info">
            {/* Google pretty much always blocks localhost from displaying the profile picture, so we add referrerpolicy="no-referrer", which basically hides the origin */}
            <img
                src={pfp}
                referrerPolicy="no-referrer"
                alt="Profile"
                className="display_user_profile_picture"
            />
            <div className="display_user_side">
                <div className="display_user_display_name">
                    {name}
                    <br/>
                    {email}
                </div>
            </div>
        </div>
    );
}
