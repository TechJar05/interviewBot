import React from "react";
import botImage from "../assets/botImage.png";
// eslint-disable-next-line no-unused-vars
import { motion } from "framer-motion";

const Header = () => {
  return (
    <header className="w-full bg-[#00adb5]  shadow-md px-6 py-4">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
        className="flex items-center gap-4 max-w-7xl mx-auto"
      >
        {/* Bot Image */}
        <motion.img
          src={botImage}
          alt="Bot Logo"
          className="w-12 h-12 rounded-full  bg-white shadow-md border border-white object-cover"
          whileHover={{ scale: 1.1, rotate: 6 }}
          transition={{ type: "spring", stiffness: 300 }}
        />

        {/* Text Section */}
        <div>
          <h1 className="text-2xl md:text-3xl font-[sans-serif] text-white">
            <span className="font-extrabold text-3xl">NEX AI</span>{" "}
            <span className="text-2xl font-medium">Interview Assistant</span>
          </h1>
          <p className="text-sm text-white mt-1 hidden sm:block font-[sans-serif]">
            Your smart companion for automated interviews
          </p>
        </div>
      </motion.div>
    </header>
  );
};

export default Header;
